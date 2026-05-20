import type { Request, Response } from "express";
import { z } from "zod";
import type { AppContext } from "../types/app.js";

const ProgressSchema = z.object({
  userId: z.string().trim().optional(),
  videoId: z.string().trim().min(1),
  completed: z.boolean().default(false),
  quizScore: z.number().min(0).max(100).default(0),
  watchedPercentage: z.number().min(0).max(100).default(0)
});

export function createProgressController(context: AppContext) {
  return {
    updateProgress: async (request: Request, response: Response) => {
      const input = ProgressSchema.parse(request.body);
      const progress = await context.repository.upsertProgress({
        ...input,
        userId: request.auth?.user.id ?? input.userId ?? "demo-user"
      });
      response.json({ progress });
    },

    getUserProgress: async (request: Request, response: Response) => {
      const requestedUserId = z.string().parse(request.params.userId);
      const userId = request.auth?.user.id ?? requestedUserId;
      const progress = await context.repository.getProgressForUser(userId);
      response.json({ progress });
    }
  };
}
