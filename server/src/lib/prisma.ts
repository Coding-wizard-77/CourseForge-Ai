import type { PoolConfig } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.js";
import { ConfigurationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

type GlobalWithPrisma = typeof globalThis & {
  __courseforgePrisma?: PrismaClient;
};

function createPrismaClient() {
  if (!env.DATABASE_URL) {
    throw new ConfigurationError("DATABASE_URL is required to initialize PrismaClient.", {
      fix: "Set DATABASE_URL in server/.env to your Neon PostgreSQL connection string."
    });
  }

  const adapter = new PrismaPg(getPgConfig(env.DATABASE_URL), {
    onPoolError: (error) => logger.error("Prisma PostgreSQL pool error", { message: error.message }),
    onConnectionError: (error) => logger.error("Prisma PostgreSQL connection error", { message: error.message })
  });

  return new PrismaClient({
    adapter,
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" }
          ]
        : [
            { emit: "stdout", level: "error" },
            { emit: "stdout", level: "warn" }
          ]
  });
}

const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma = globalForPrisma.__courseforgePrisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.__courseforgePrisma = prisma;
}

export async function validatePrismaConnection() {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  return prisma;
}

function getPgConfig(connectionString: string): PoolConfig {
  return {
    connectionString,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    ssl: needsSslFallback(connectionString) ? { rejectUnauthorized: false } : undefined
  };
}

function needsSslFallback(connectionString: string) {
  return connectionString.includes("neon.tech") && !/[?&]sslmode=/.test(connectionString);
}
