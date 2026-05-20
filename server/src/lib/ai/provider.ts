import { ApiError, GoogleGenAI, type Content, type GenerateContentConfig, type GenerateContentResponse } from "@google/genai";
import { env } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { timeAsync, withTimeout } from "../../utils/timing.js";

const FALLBACK_COOLDOWN_MS = 5 * 60 * 1000;
const DEFAULT_RETRY_ATTEMPTS = 3;

export type AiModelPreference = "fast" | "advanced" | string;

export interface AiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiTextInput {
  instructions?: string;
  prompt: string;
  fallback: string;
  messages?: AiMessage[];
  model?: AiModelPreference;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  onChunk?: (chunk: string) => void;
}

export interface AiJsonInput<T> {
  instructions: string;
  prompt: string;
  fallback: T;
  messages?: AiMessage[];
  model?: AiModelPreference;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  schema?: unknown;
  validate?: (value: unknown) => T;
}

export interface AiHealth {
  service: "Gemini";
  ok: boolean;
  skipped?: boolean;
  modelAvailable?: boolean;
  generationText?: string;
  embeddingDimensions?: number;
  latencyMs?: {
    models?: number;
    generation?: number;
    embeddings?: number;
  };
  error?: string;
  fix?: string;
}

export interface AiProvider {
  readonly enabled: boolean;
  generateText(input: AiTextInput): Promise<string>;
  generateJson<T>(input: AiJsonInput<T>): Promise<T>;
  streamText(input: AiTextInput): AsyncGenerator<string>;
  embedTexts(texts: string[]): Promise<number[][]>;
  validateConnection(): Promise<AiHealth>;
}

export class GeminiProvider implements AiProvider {
  private readonly client: GoogleGenAI | null;
  private fallbackUntil = 0;

  constructor(client = createGeminiClient()) {
    this.client = client;
  }

  get enabled() {
    return Boolean(this.client);
  }

  async generateText(input: AiTextInput) {
    if (!this.client || this.isFallbackActive()) {
      return input.fallback;
    }

    const model = resolveGeminiModel(input.model);
    const config = buildGenerateConfig({
      instructions: collectSystemInstructions(input.instructions, input.messages),
      model,
      maxOutputTokens: input.maxOutputTokens ?? 900,
      temperature: input.temperature ?? 0.35,
      timeoutMs: input.timeoutMs
    });

    return this.withGeminiRetry(
      "Gemini text generation",
      async () => {
        const response = await withTimeout(
          "Gemini text generation",
          this.client!.models.generateContent({
            model,
            contents: buildContents(input.prompt, input.messages),
            config
          }),
          input.timeoutMs ?? env.GEMINI_TIMEOUT_MS
        );

        return extractResponseText(response) || input.fallback;
      },
      input.fallback
    );
  }

  async generateJson<T>(input: AiJsonInput<T>): Promise<T> {
    if (!this.client || this.isFallbackActive()) {
      return input.fallback;
    }

    const model = resolveGeminiModel(input.model);
    const config = buildGenerateConfig({
      instructions: collectSystemInstructions([
        input.instructions,
        "Return only valid JSON that matches the requested shape.",
        "Do not wrap the JSON in Markdown. Do not add commentary or comments."
      ].join("\n"), input.messages),
      model,
      maxOutputTokens: input.maxOutputTokens ?? 1800,
      temperature: input.temperature ?? 0.2,
      timeoutMs: input.timeoutMs,
      jsonSchema: input.schema
    });

    return this.withGeminiRetry(
      "Gemini JSON generation",
      async () => {
        const response = await withTimeout(
          "Gemini JSON generation",
          this.client!.models.generateContent({
            model,
            contents: buildContents(input.prompt, input.messages),
            config
          }),
          input.timeoutMs ?? env.GEMINI_TIMEOUT_MS
        );

        const text = extractResponseText(response);
        if (!text) {
          throw new Error("Gemini returned an empty JSON response.");
        }

        const parsed = parseJsonWithRepair<unknown>(text);
        return input.validate ? input.validate(parsed) : (parsed as T);
      },
      input.fallback
    );
  }

  async *streamText(input: AiTextInput): AsyncGenerator<string> {
    if (!this.client || this.isFallbackActive()) {
      yield input.fallback;
      return;
    }

    const model = resolveGeminiModel(input.model);
    const config = buildGenerateConfig({
      instructions: collectSystemInstructions(input.instructions, input.messages),
      model,
      maxOutputTokens: input.maxOutputTokens ?? 900,
      temperature: input.temperature ?? 0.35,
      timeoutMs: input.timeoutMs
    });

    const stream = await this.withGeminiRetry(
      "Gemini streaming setup",
      () =>
        withTimeout(
          "Gemini streaming setup",
          this.client!.models.generateContentStream({
            model,
            contents: buildContents(input.prompt, input.messages),
            config
          }),
          input.timeoutMs ?? env.GEMINI_TIMEOUT_MS
        ),
      null
    );

    if (!stream) {
      yield input.fallback;
      return;
    }

    let emitted = false;

    try {
      for await (const chunk of stream) {
        const text = extractResponseText(chunk);
        if (!text) {
          continue;
        }
        emitted = true;
        input.onChunk?.(text);
        yield text;
      }
    } catch (error) {
      this.enableFallbackForQuotaError(error);
      logger.warn("Gemini stream failed", {
        error: error instanceof Error ? error.message : "unknown error"
      });
      if (!emitted) {
        yield input.fallback;
      }
      return;
    }

    if (!emitted) {
      yield input.fallback;
    }
  }

  async embedTexts(texts: string[]) {
    if (!this.client || texts.length === 0 || this.isFallbackActive()) {
      return texts.map((text) => createDeterministicEmbedding(text));
    }

    return this.withGeminiRetry(
      "Gemini embeddings",
      async () => {
        const response = await withTimeout(
          "Gemini embeddings",
          this.client!.models.embedContent({
            model: env.GEMINI_EMBEDDING_MODEL,
            contents: texts,
            config: {
              taskType: "SEMANTIC_SIMILARITY",
              outputDimensionality: env.GEMINI_EMBEDDING_DIMENSIONS,
              httpOptions: {
                timeout: env.GEMINI_TIMEOUT_MS
              }
            }
          }),
          env.GEMINI_TIMEOUT_MS
        );

        const embeddings = response.embeddings?.map((embedding) => embedding.values ?? []) ?? [];
        if (embeddings.length !== texts.length || embeddings.some((embedding) => !isValidEmbedding(embedding))) {
          throw new Error("Gemini embedding response did not contain valid vectors for every input.");
        }

        return embeddings;
      },
      texts.map((text) => createDeterministicEmbedding(text))
    );
  }

  async validateConnection(): Promise<AiHealth> {
    if (!this.client) {
      return {
        service: "Gemini",
        ok: false,
        skipped: true,
        error: "GEMINI_API_KEY is empty.",
        fix: "Set GEMINI_API_KEY in server/.env with a valid Google AI Studio API key."
      };
    }

    try {
      logger.info("Testing Gemini model availability", { model: env.GEMINI_MODEL });
      const modelTiming = await timeAsync("Gemini models.list", () => this.listModelIds());
      const modelAvailable = modelTiming.result.includes(env.GEMINI_MODEL);

      if (!modelAvailable) {
        logger.warn("Configured Gemini model was not returned by models.list; direct generation will still be tested.", {
          model: env.GEMINI_MODEL
        });
      }

      const generationTiming = await timeAsync("Gemini generation test", () =>
        withTimeout(
          "Gemini generation test",
          this.client!.models.generateContent({
            model: env.GEMINI_MODEL,
            contents: "Hello from CourseForge AI",
            config: buildGenerateConfig({
              instructions: "Return exactly the requested phrase and nothing else.",
              model: env.GEMINI_MODEL,
              maxOutputTokens: 40,
              temperature: 0
            })
          }),
          env.GEMINI_TIMEOUT_MS
        )
      );
      const generationText = extractResponseText(generationTiming.result);

      const embeddingTiming = await timeAsync("Gemini embedding test", () =>
        withTimeout(
          "Gemini embedding test",
          this.client!.models.embedContent({
            model: env.GEMINI_EMBEDDING_MODEL,
            contents: "C++ pointers tutorial",
            config: {
              taskType: "SEMANTIC_SIMILARITY",
              outputDimensionality: env.GEMINI_EMBEDDING_DIMENSIONS
            }
          }),
          env.GEMINI_TIMEOUT_MS
        )
      );
      const embedding = embeddingTiming.result.embeddings?.[0]?.values ?? [];

      if (!isValidEmbedding(embedding)) {
        throw new Error("Gemini embedding response did not contain a valid numeric vector.");
      }

      logger.success("Gemini connected");
      logger.success("Gemini embeddings working", { dimensions: embedding.length, latencyMs: embeddingTiming.latencyMs });
      logger.debug("Gemini retry handling enabled", { retries: DEFAULT_RETRY_ATTEMPTS, backoff: "exponential" });

      return {
        service: "Gemini",
        ok: true,
        modelAvailable,
        generationText,
        embeddingDimensions: embedding.length,
        latencyMs: {
          models: modelTiming.latencyMs,
          generation: generationTiming.latencyMs,
          embeddings: embeddingTiming.latencyMs
        }
      };
    } catch (error) {
      this.enableFallbackForQuotaError(error);
      return {
        service: "Gemini",
        ok: false,
        error: error instanceof Error ? error.message : "Gemini validation failed.",
        fix: explainGeminiFix(error)
      };
    }
  }

  private async listModelIds() {
    const pager = await withTimeout(
      "Gemini models.list",
      this.client!.models.list({
        config: {
          pageSize: 100,
          queryBase: true,
          httpOptions: {
            timeout: env.GEMINI_TIMEOUT_MS
          }
        }
      }),
      env.GEMINI_TIMEOUT_MS
    );
    const ids: string[] = [];

    for await (const model of pager) {
      if (model.name) {
        ids.push(model.name.replace(/^models\//, ""));
      }
      if (ids.length >= 250) {
        break;
      }
    }

    return ids;
  }

  private async withGeminiRetry<T>(label: string, task: () => Promise<T>, fallback: T) {
    let lastError: unknown;

    for (let attempt = 1; attempt <= DEFAULT_RETRY_ATTEMPTS; attempt += 1) {
      try {
        return await task();
      } catch (error) {
        lastError = error;
        const status = getErrorStatus(error);

        if (isQuotaOrBillingError(error)) {
          this.enableFallbackForQuotaError(error);
          break;
        }

        const retryable = status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

        if (!retryable || attempt === DEFAULT_RETRY_ATTEMPTS) {
          break;
        }

        const delay = 500 * 2 ** (attempt - 1);
        logger.warn(`${label} retrying after API error`, { status, attempt, delayMs: delay });
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    logger.warn(`${label} falling back`, {
      error: lastError instanceof Error ? lastError.message : "unknown error"
    });
    return fallback;
  }

  private isFallbackActive() {
    return Date.now() < this.fallbackUntil;
  }

  private enableFallbackForQuotaError(error: unknown) {
    if (!isQuotaOrBillingError(error)) {
      return;
    }

    this.fallbackUntil = Math.max(this.fallbackUntil, Date.now() + FALLBACK_COOLDOWN_MS);
    logger.warn("Gemini quota/billing limit detected; using deterministic fallbacks temporarily", {
      fallbackSeconds: FALLBACK_COOLDOWN_MS / 1000
    });
  }
}

function createGeminiClient(apiKey = env.GEMINI_API_KEY) {
  const resolvedApiKey = (apiKey ?? "").trim();
  if (!resolvedApiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey: resolvedApiKey,
    httpOptions: {
      apiVersion: env.GEMINI_API_VERSION,
      timeout: env.GEMINI_TIMEOUT_MS
    }
  });
}

export function createGeminiProvider(apiKey?: string | null) {
  return new GeminiProvider(createGeminiClient(apiKey?.trim() || env.GEMINI_API_KEY));
}

function buildGenerateConfig(input: {
  instructions?: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  timeoutMs?: number;
  jsonSchema?: unknown;
}): GenerateContentConfig {
  const config: GenerateContentConfig = {
    maxOutputTokens: input.maxOutputTokens,
    temperature: input.temperature,
    httpOptions: {
      timeout: input.timeoutMs ?? env.GEMINI_TIMEOUT_MS
    }
  };

  if (input.instructions) {
    config.systemInstruction = input.instructions;
  }

  const thinkingConfig = buildThinkingConfig(input.model);
  if (thinkingConfig) {
    config.thinkingConfig = thinkingConfig;
  }

  if (input.jsonSchema) {
    config.responseMimeType = "application/json";
    config.responseJsonSchema = input.jsonSchema;
  } else if (input.instructions?.includes("Return only valid JSON")) {
    config.responseMimeType = "application/json";
  }

  return config;
}

function buildContents(prompt: string, messages: AiMessage[] = []): string | Content[] {
  if (!messages.length) {
    return prompt;
  }

  return messages
    .filter((message) => message.role !== "system")
    .concat({ role: "user", content: prompt })
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }]
    }));
}

function collectSystemInstructions(instructions?: string, messages: AiMessage[] = []) {
  const systemMessages = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content.trim())
    .filter(Boolean);
  return [instructions, ...systemMessages].filter(Boolean).join("\n") || undefined;
}

function buildThinkingConfig(model: string) {
  if (/gemini-2\.5-flash/i.test(model)) {
    return { thinkingBudget: 0 };
  }

  if (/gemini-2\.5-pro/i.test(model)) {
    return { thinkingBudget: 128 };
  }

  return undefined;
}

export function resolveGeminiModel(preference?: AiModelPreference) {
  if (!preference || preference === "fast") {
    return env.GEMINI_MODEL;
  }
  if (preference === "advanced") {
    return env.GEMINI_ADVANCED_MODEL;
  }
  return preference;
}

function extractResponseText(response: GenerateContentResponse) {
  return response.text?.trim() ?? "";
}

export function parseJsonWithRepair<T>(raw: string): T {
  const candidates = unique([
    stripJsonFence(raw),
    extractBalancedJson(stripJsonFence(raw)),
    repairJsonText(stripJsonFence(raw)),
    repairJsonText(extractBalancedJson(stripJsonFence(raw)) ?? "")
  ].filter((candidate): candidate is string => Boolean(candidate?.trim())));

  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not parse Gemini JSON response: ${lastError instanceof Error ? lastError.message : "unknown parse error"}`);
}

function stripJsonFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function repairJsonText(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .replace(/,\s*([}\]])/g, "$1")
    .trim();
}

function extractBalancedJson(value: string) {
  const start = value.search(/[\[{]/);
  if (start === -1) {
    return undefined;
  }

  const opener = value[start];
  const closer = opener === "{" ? "}" : "]";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let index = start; index < value.length; index += 1) {
    const char = value[index];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (char === "{" || char === "[") {
      stack.push(char === "{" ? "}" : "]");
      continue;
    }
    if (char === "}" || char === "]") {
      const expected = stack.pop();
      if (char !== expected) {
        return undefined;
      }
      if (stack.length === 0 && char === closer) {
        return value.slice(start, index + 1).trim();
      }
    }
  }

  return undefined;
}

export function createDeterministicEmbedding(text: string, dimensions = env.GEMINI_EMBEDDING_DIMENSIONS) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9+#.]+/g) ?? [];

  for (const token of tokens) {
    const index = Math.abs(hashString(token)) % dimensions;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function isValidEmbedding(embedding: number[]) {
  return embedding.length > 0 && embedding.every((value) => Number.isFinite(value));
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function getErrorStatus(error: unknown) {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  const record = error as { status?: unknown; statusCode?: unknown; code?: unknown };
  return Number(record.status ?? record.statusCode ?? record.code) || undefined;
}

function isQuotaOrBillingError(error: unknown) {
  const status = getErrorStatus(error);
  const message = error instanceof Error ? error.message : "";
  return (status === 429 || status === 403) && /quota|billing|rate|resource_exhausted|resource exhausted/i.test(message);
}

function explainGeminiFix(error: unknown) {
  const status = getErrorStatus(error);
  if (status === 400) {
    return `Check GEMINI_MODEL (${env.GEMINI_MODEL}), GEMINI_EMBEDDING_MODEL (${env.GEMINI_EMBEDDING_MODEL}), and request schema compatibility.`;
  }
  if (status === 401 || status === 403) {
    return "Check GEMINI_API_KEY. It may be missing, revoked, restricted, or blocked from the Gemini API.";
  }
  if (status === 404) {
    return `${env.GEMINI_MODEL} was not found. Verify GEMINI_MODEL or choose gemini-2.5-flash/gemini-2.5-pro.`;
  }
  if (status === 429) {
    return "Gemini rate limit or quota was reached. Retry handling is active; increase quota or retry later.";
  }
  return "Verify GEMINI_API_KEY, Gemini API access, model names, network access, and project billing/quota.";
}

export const aiProvider = new GeminiProvider();
