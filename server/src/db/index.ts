import { featureFlags } from "../config/env.js";
import { MemoryRepository } from "./memoryRepository.js";
import type { AppRepository } from "./repository.js";

export async function createRepository(): Promise<AppRepository> {
  const repository = featureFlags.postgres
    ? new (await import("./prismaRepository.js")).PrismaRepository()
    : new MemoryRepository();
  await repository.init();
  return repository;
}
