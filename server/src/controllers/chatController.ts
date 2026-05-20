import type { Request, Response } from "express";
import { z } from "zod";
import { answerLessonQuestion } from "../agents/embeddingRagAgent.js";
import { getRequestAiClient } from "../services/requestAiClient.js";
import type { AppContext } from "../types/app.js";

const ChatSchema = z.object({
  courseId: z.string().trim().min(1),
  videoId: z.string().trim().optional(),
  question: z.string().trim().min(2)
});

export function createChatController(context: AppContext) {
  return {
    askLessonAssistant: async (request: Request, response: Response) => {
      const input = ChatSchema.parse(request.body);
      const result = await answerLessonQuestion({
        ...input,
        vectorStore: context.vectorStore,
        ai: getRequestAiClient(request)
      });
      response.json(result);
    }
  };
}
