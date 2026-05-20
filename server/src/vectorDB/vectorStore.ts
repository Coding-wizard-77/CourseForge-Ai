import fs from "node:fs/promises";
import path from "node:path";
import { Pinecone, type Index, type RecordMetadata } from "@pinecone-database/pinecone";
import { env, featureFlags } from "../config/env.js";
import { cosineSimilarity, embedTexts } from "../embeddings/embeddingService.js";
import type { TranscriptChunk } from "../types/course.js";
import { logger } from "../utils/logger.js";
import { timeAsync, withTimeout } from "../utils/timing.js";

export interface VectorSearchResult {
  chunk: TranscriptChunk;
  score: number;
}

export interface VectorStore {
  upsert(chunks: TranscriptChunk[]): Promise<void>;
  query(input: {
    courseId?: string;
    videoId?: string;
    embedding: number[];
    topK: number;
  }): Promise<VectorSearchResult[]>;
}

interface CourseforgeVectorMetadata extends RecordMetadata {
  courseId: string;
  videoId: string;
  moduleId: string;
  text: string;
  topic: string;
  moduleTitle: string;
  videoTitle: string;
}

interface PineconeTestMetadata extends RecordMetadata {
  topic: string;
  transcriptChunk: string;
  source: string;
}

export interface PineconeHealth {
  service: "Pinecone";
  ok: boolean;
  skipped?: boolean;
  indexDimension?: number;
  embeddingDimensions?: number;
  namespace?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  latencyMs?: number;
  error?: string;
  fix?: string;
}

export async function createVectorStore(): Promise<VectorStore> {
  if (featureFlags.pinecone) {
    try {
      return await PineconeVectorStore.create();
    } catch (error) {
      logger.warn("Pinecone unavailable, using local vector store", {
        error: error instanceof Error ? error.message : "unknown error"
      });
    }
  }

  return new LocalVectorStore();
}

class LocalVectorStore implements VectorStore {
  private readonly filePath = path.join(process.cwd(), "data", "vector-store.json");
  private chunks: TranscriptChunk[] = [];
  private loaded = false;

  async upsert(chunks: TranscriptChunk[]) {
    await this.load();
    const incomingIds = new Set(chunks.map((chunk) => chunk.id));
    this.chunks = this.chunks.filter((chunk) => !incomingIds.has(chunk.id)).concat(chunks);
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.chunks, null, 2), "utf8");
  }

  async query(input: { courseId?: string; videoId?: string; embedding: number[]; topK: number }) {
    await this.load();

    return this.chunks
      .filter((chunk) => !input.courseId || chunk.courseId === input.courseId)
      .filter((chunk) => !input.videoId || chunk.videoId === input.videoId)
      .map((chunk) => ({
        chunk,
        score: cosineSimilarity(input.embedding, chunk.embedding)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, input.topK);
  }

  private async load() {
    if (this.loaded) {
      return;
    }

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.chunks = JSON.parse(raw) as TranscriptChunk[];
    } catch {
      this.chunks = [];
    }

    this.loaded = true;
  }
}

class PineconeVectorStore implements VectorStore {
  private constructor(private readonly index: Index<CourseforgeVectorMetadata>) {}

  static async create() {
    const client = new Pinecone({ apiKey: env.PINECONE_API_KEY ?? "" });
    const index = client
      .index<CourseforgeVectorMetadata>({ name: env.PINECONE_INDEX ?? "" })
      .namespace(env.PINECONE_NAMESPACE);
    return new PineconeVectorStore(index);
  }

  async upsert(chunks: TranscriptChunk[]) {
    if (chunks.length === 0) {
      return;
    }

    await this.index.upsert({
      records: chunks.map((chunk) => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          courseId: chunk.courseId,
          videoId: chunk.videoId,
          moduleId: chunk.moduleId,
          text: chunk.text,
          topic: chunk.metadata.topic,
          moduleTitle: chunk.metadata.moduleTitle,
          videoTitle: chunk.metadata.videoTitle
        }
      }))
    });
  }

  async query(input: { courseId?: string; videoId?: string; embedding: number[]; topK: number }) {
    const filter: Record<string, { $eq: string }> = {};
    if (input.courseId) {
      filter.courseId = { $eq: input.courseId };
    }
    if (input.videoId) {
      filter.videoId = { $eq: input.videoId };
    }

    const response = await this.index.query({
      vector: input.embedding,
      topK: input.topK,
      includeMetadata: true,
      filter: Object.keys(filter).length ? filter : undefined
    });

    return (response.matches ?? []).map((match) => ({
      score: match.score ?? 0,
      chunk: {
        id: match.id,
        courseId: match.metadata?.courseId ?? "",
        videoId: match.metadata?.videoId ?? "",
        moduleId: match.metadata?.moduleId ?? "",
        text: match.metadata?.text ?? "",
        embedding: [],
        metadata: {
          topic: match.metadata?.topic ?? "",
          moduleTitle: match.metadata?.moduleTitle ?? "",
          videoTitle: match.metadata?.videoTitle ?? ""
        }
      }
    }));
  }
}

export async function validatePineconeConnection(): Promise<PineconeHealth> {
  if (!featureFlags.pinecone) {
    return {
      service: "Pinecone",
      ok: false,
      skipped: true,
      error: "PINECONE_API_KEY or PINECONE_INDEX is empty.",
      fix: "Set PINECONE_API_KEY and PINECONE_INDEX in server/.env."
    };
  }

  try {
    const timing = await timeAsync("Pinecone vector test", async () => {
      const client = new Pinecone({ apiKey: env.PINECONE_API_KEY ?? "" });
      const indexDescription = await withTimeout(
        "Pinecone describe index",
        client.describeIndex(env.PINECONE_INDEX ?? ""),
        20_000
      );
      const index = client
        .index<PineconeTestMetadata>({ name: env.PINECONE_INDEX ?? "" })
        .namespace(env.PINECONE_NAMESPACE);
      const [testVector, queryVector] = await embedTexts(["C++ pointers", "memory address"]);

      if (!testVector.length || !queryVector.length) {
        throw new Error("Embedding vectors were empty; Pinecone test cannot continue.");
      }

      if (indexDescription.dimension && indexDescription.dimension !== testVector.length) {
        throw new Error(
          `Pinecone index dimension ${indexDescription.dimension} does not match embedding dimension ${testVector.length}.`
        );
      }

      const id = `courseforge-health-${Date.now()}`;
      await withTimeout(
        "Pinecone upsert",
        index.upsert({
          records: [
            {
              id,
              values: testVector,
              metadata: {
                topic: "C++ pointers",
                transcriptChunk: "Pointers store memory addresses and help explain indirection in C++.",
                source: "startup-validation"
              }
            }
          ]
        }),
        20_000
      );

      const query = await withTimeout(
        "Pinecone query",
        index.query({
          vector: queryVector,
          topK: 1,
          includeMetadata: true
        }),
        20_000
      );

      return {
        indexDimension: indexDescription.dimension,
        embeddingDimensions: testVector.length,
        match: query.matches?.[0]
      };
    });

    logger.success("Pinecone connected", {
      namespace: env.PINECONE_NAMESPACE,
      score: timing.result.match?.score,
      latencyMs: timing.latencyMs
    });
    logger.success("Vector search working");

    return {
      service: "Pinecone",
      ok: true,
      namespace: env.PINECONE_NAMESPACE,
      indexDimension: timing.result.indexDimension,
      embeddingDimensions: timing.result.embeddingDimensions,
      score: timing.result.match?.score,
      metadata: timing.result.match?.metadata,
      latencyMs: timing.latencyMs
    };
  } catch (error) {
    return {
      service: "Pinecone",
      ok: false,
      error: error instanceof Error ? error.message : "Pinecone validation failed.",
      fix: explainPineconeFix(error)
    };
  }
}

function explainPineconeFix(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/dimension/i.test(message)) {
    const configuredDimensions = `${env.GEMINI_EMBEDDING_MODEL} with GEMINI_EMBEDDING_DIMENSIONS=${env.GEMINI_EMBEDDING_DIMENSIONS}`;
    return `Create or configure the Pinecone index with the same dimension as ${configuredDimensions}, or change the embedding model/dimensions.`;
  }
  if (/not found|404/i.test(message)) {
    return "Create the Pinecone index named by PINECONE_INDEX or fix the index name in server/.env.";
  }
  if (/unauthorized|forbidden|401|403/i.test(message)) {
    return "Check PINECONE_API_KEY and ensure it has access to the configured index.";
  }
  return "Verify PINECONE_API_KEY, PINECONE_INDEX, namespace, network access, and embedding/index dimensions.";
}
