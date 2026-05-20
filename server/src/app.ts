import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { createRepository } from "./db/index.js";
import { env, LOCAL_CLIENT_ORIGIN, RENDER_CLIENT_ORIGIN } from "./services/env.js";
import { explainError } from "./utils/errors.js";
import { logger } from "./utils/logger.js";
import { CourseOrchestrator } from "./services/courseOrchestrator.js";
import { createApiRouter } from "./routes/api.js";
import { createVectorStore } from "./vectorDB/vectorStore.js";

export async function createApp() {
  const repository = await createRepository();
  const vectorStore = await createVectorStore();
  const orchestrator = new CourseOrchestrator(repository, vectorStore);
  const allowedCorsOrigins = Array.from(new Set([LOCAL_CLIENT_ORIGIN, RENDER_CLIENT_ORIGIN, normalizeOrigin(env.CLIENT_ORIGIN)]));

  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(
    cors({
      origin: allowedCorsOrigins,
      credentials: true
    })
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(morgan("dev"));

  app.use("/api", createApiRouter({ repository, vectorStore, orchestrator }));

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const explained = explainError(error);
    logger.error("Request failed", explained);
    response.status(explained.statusCode ?? 500).json({
      message: explained.message,
      code: explained.code,
      details: explained.details
    });
  });

  return app;
}

function normalizeOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}
