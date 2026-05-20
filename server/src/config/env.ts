import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { maskSecret } from "../utils/logger.js";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");
dotenv.config({ path: envPath });

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);
const DEFAULT_JWT_ACCESS_SECRET = "courseforge-dev-access-secret-change-before-production";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8080),
  CLIENT_ORIGIN: z.string().url().default("http://localhost:3000"),
  GEMINI_API_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_ADVANCED_MODEL: z.string().min(1).default("gemini-2.5-pro"),
  GEMINI_EMBEDDING_MODEL: z.string().min(1).default("gemini-embedding-001"),
  GEMINI_EMBEDDING_DIMENSIONS: z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(768)),
  GEMINI_API_VERSION: z.string().min(1).default("v1beta"),
  GEMINI_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  YOUTUBE_API_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  DATABASE_URL: z.preprocess(emptyToUndefined, z.string().url().optional()),
  JWT_ACCESS_SECRET: z
    .preprocess(emptyToUndefined, z.string().min(32).optional())
    .default(DEFAULT_JWT_ACCESS_SECRET),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  GOOGLE_OAUTH_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  GOOGLE_OAUTH_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(10).optional()),
  GOOGLE_OAUTH_REDIRECT_URI: z.preprocess(emptyToUndefined, z.string().url().optional()),
  PINECONE_API_KEY: z.preprocess(emptyToUndefined, z.string().min(20).optional()),
  PINECONE_INDEX: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  PINECONE_NAMESPACE: z.string().min(1).default("courseforge")
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message
  }));

  throw new Error(`Invalid environment configuration: ${JSON.stringify(issues, null, 2)}`);
}

if (parsed.data.NODE_ENV === "production" && parsed.data.JWT_ACCESS_SECRET === DEFAULT_JWT_ACCESS_SECRET) {
  throw new Error("Invalid environment configuration: JWT_ACCESS_SECRET must be set in production.");
}

export const env = parsed.data;

export const featureFlags = {
  gemini: Boolean(env.GEMINI_API_KEY),
  youtube: Boolean(env.YOUTUBE_API_KEY),
  postgres: Boolean(env.DATABASE_URL),
  pinecone: Boolean(env.PINECONE_API_KEY && env.PINECONE_INDEX),
  googleOAuth: Boolean(env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET)
};

export function getConfigurationIssues() {
  const issues: Array<{ service: string; severity: "warning" | "error"; message: string; fix: string }> = [];

  if (!env.GEMINI_API_KEY) {
    issues.push({
      service: "Gemini",
      severity: "warning",
      message: "GEMINI_API_KEY is empty; Gemini calls will use deterministic fallbacks.",
      fix: "Add a valid Google AI Studio Gemini API key to server/.env."
    });
  }

  if (!env.YOUTUBE_API_KEY) {
    issues.push({
      service: "YouTube",
      severity: "warning",
      message: "YOUTUBE_API_KEY is empty; YouTube search will use demo educational resources.",
      fix: "Create a YouTube Data API v3 key in Google Cloud and set YOUTUBE_API_KEY."
    });
  }

  if (!env.DATABASE_URL) {
    issues.push({
      service: "PostgreSQL",
      severity: "warning",
      message: "DATABASE_URL is empty; persistence will fall back to memory.",
      fix: "Set DATABASE_URL to the Neon PostgreSQL connection string."
    });
  } else if (env.DATABASE_URL.includes("neon.tech") && !/[?&]sslmode=/.test(env.DATABASE_URL)) {
    issues.push({
      service: "PostgreSQL",
      severity: "warning",
      message: "Neon connection string does not include sslmode.",
      fix: "Append ?sslmode=verify-full, or rely on the runtime pg adapter SSL fallback configured in src/lib/prisma.ts."
    });
  }

  if (env.NODE_ENV === "production" && env.JWT_ACCESS_SECRET.includes("change-before-production")) {
    issues.push({
      service: "Authentication",
      severity: "error",
      message: "JWT_ACCESS_SECRET is using the development fallback in production.",
      fix: "Set JWT_ACCESS_SECRET to a strong random value with at least 32 characters."
    });
  }

  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_CLIENT_SECRET) {
    issues.push({
      service: "Google OAuth",
      severity: "warning",
      message: "Google OAuth credentials are incomplete; email/password auth will still work.",
      fix: "Set GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI."
    });
  }

  if (!env.PINECONE_API_KEY || !env.PINECONE_INDEX) {
    issues.push({
      service: "Pinecone",
      severity: "warning",
      message: "Pinecone credentials are incomplete; local JSON vector storage will be used.",
      fix: "Set PINECONE_API_KEY and PINECONE_INDEX in server/.env."
    });
  }

  return issues;
}

export function getSafeEnvSummary() {
  return {
    NODE_ENV: env.NODE_ENV,
    PORT: env.PORT,
    CLIENT_ORIGIN: env.CLIENT_ORIGIN,
    GEMINI_API_KEY: maskSecret(env.GEMINI_API_KEY),
    GEMINI_MODEL: env.GEMINI_MODEL,
    GEMINI_ADVANCED_MODEL: env.GEMINI_ADVANCED_MODEL,
    GEMINI_EMBEDDING_MODEL: env.GEMINI_EMBEDDING_MODEL,
    GEMINI_EMBEDDING_DIMENSIONS: env.GEMINI_EMBEDDING_DIMENSIONS,
    GEMINI_API_VERSION: env.GEMINI_API_VERSION,
    GEMINI_TIMEOUT_MS: env.GEMINI_TIMEOUT_MS,
    YOUTUBE_API_KEY: maskSecret(env.YOUTUBE_API_KEY),
    DATABASE_URL: maskSecret(env.DATABASE_URL),
    JWT_ACCESS_SECRET: maskSecret(env.JWT_ACCESS_SECRET),
    JWT_ACCESS_TTL_SECONDS: env.JWT_ACCESS_TTL_SECONDS,
    REFRESH_TOKEN_TTL_DAYS: env.REFRESH_TOKEN_TTL_DAYS,
    COOKIE_DOMAIN: env.COOKIE_DOMAIN ?? "<empty>",
    GOOGLE_OAUTH_CLIENT_ID: maskSecret(env.GOOGLE_OAUTH_CLIENT_ID),
    GOOGLE_OAUTH_CLIENT_SECRET: maskSecret(env.GOOGLE_OAUTH_CLIENT_SECRET),
    GOOGLE_OAUTH_REDIRECT_URI: env.GOOGLE_OAUTH_REDIRECT_URI ?? "<empty>",
    PINECONE_API_KEY: maskSecret(env.PINECONE_API_KEY),
    PINECONE_INDEX: env.PINECONE_INDEX ?? "<empty>",
    PINECONE_NAMESPACE: env.PINECONE_NAMESPACE
  };
}
