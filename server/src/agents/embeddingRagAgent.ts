import { embedTexts } from "../embeddings/embeddingService.js";
import type { AiProvider } from "../lib/ai/provider.js";
import type { Course, TranscriptChunk } from "../types/course.js";
import { createId } from "../utils/id.js";
import { chunkText } from "../utils/text.js";
import type { VectorStore } from "../vectorDB/vectorStore.js";
import { aiClient } from "../services/aiClient.js";

export async function indexCourseTranscripts(course: Course, vectorStore: VectorStore, ai?: AiProvider) {
  const rawChunks = course.modules.flatMap((module) =>
    module.videos.flatMap((video) =>
      chunkText(video.transcript, 150).map((text) => ({
        id: createId("chunk"),
        courseId: course.id,
        videoId: video.id,
        moduleId: module.id,
        text,
        metadata: {
          topic: course.topic,
          moduleTitle: module.title,
          videoTitle: video.title
        }
      }))
    )
  );

  const embeddings = await embedTexts(rawChunks.map((chunk) => chunk.text), ai);
  const chunks: TranscriptChunk[] = rawChunks.map((chunk, index) => ({
    ...chunk,
    embedding: embeddings[index]
  }));

  await vectorStore.upsert(chunks);
  return chunks.length;
}

export async function answerLessonQuestion(input: {
  courseId: string;
  videoId?: string;
  question: string;
  vectorStore: VectorStore;
  ai?: AiProvider;
}) {
  const ai = input.ai ?? aiClient;
  const [questionEmbedding] = await embedTexts([input.question], ai);
  const results = await input.vectorStore.query({
    courseId: input.courseId,
    videoId: input.videoId,
    embedding: questionEmbedding,
    topK: 5
  });

  const context = results.map((result) => result.chunk.text).join("\n\n");
  const fallback = buildFallbackAnswer(input.question, context);

  const answer = await ai.generateText({
    instructions:
      "You are the CourseForge AI lesson assistant. Answer using only the retrieved transcript context. If the context is thin, say what is missing and give a cautious learner-friendly explanation. Be concise and concrete.",
    prompt: JSON.stringify({
      question: input.question,
      retrievedContext: context
    }),
    fallback,
    maxOutputTokens: 800
  });

  return {
    answer,
    sources: results.map((result) => ({
      videoId: result.chunk.videoId,
      moduleId: result.chunk.moduleId,
      videoTitle: result.chunk.metadata.videoTitle,
      score: result.score
    }))
  };
}

function buildFallbackAnswer(question: string, context: string) {
  if (!context) {
    return `I do not have transcript context for "${question}" yet. Try asking about the current lesson after the course has been indexed.`;
  }

  return `Based on the lesson context, the key idea is: ${context.slice(0, 360)}... In simpler terms, connect the definition to a small example, then test yourself by explaining each step without notes.`;
}
