import type { AppRepository } from "../db/repository.js";
import type { VectorStore } from "../vectorDB/vectorStore.js";
import type { CourseOrchestrator } from "../services/courseOrchestrator.js";

export interface AppContext {
  repository: AppRepository;
  vectorStore: VectorStore;
  orchestrator: CourseOrchestrator;
}
