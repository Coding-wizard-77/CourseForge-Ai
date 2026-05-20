import type { Request, Response } from "express";
import { z } from "zod";
import type { AppContext } from "../types/app.js";

const SubmitQuizSchema = z.object({
  userId: z.string().trim().optional(),
  videoId: z.string().trim().min(1),
  answers: z.record(z.string(), z.string())
});

export function createQuizController(context: AppContext) {
  return {
    getQuizByVideo: async (request: Request, response: Response) => {
      const videoId = z.string().parse(request.params.videoId);
      const quiz = await context.repository.getQuizByVideo(videoId);
      response.json({ quiz });
    },

    submitQuiz: async (request: Request, response: Response) => {
      const input = SubmitQuizSchema.parse(request.body);
      const userId = request.auth?.user.id ?? input.userId ?? "demo-user";
      const quiz = await context.repository.getQuizByVideo(input.videoId);
      const graded = quiz.map((question) => {
        const answer = input.answers[question.id] ?? "";
        const isCorrect = normalize(answer) === normalize(question.correctAnswer);
        return {
          questionId: question.id,
          answer,
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation,
          weakArea: isCorrect ? null : question.question
        };
      });
      const correct = graded.filter((item) => item.isCorrect).length;
      const score = quiz.length ? Math.round((correct / quiz.length) * 100) : 0;

      const attempt = await context.repository.saveQuizAttempt({
        userId,
        videoId: input.videoId,
        score,
        total: quiz.length,
        weakAreas: graded.flatMap((item) => (item.weakArea ? [item.weakArea] : []))
      });

      await context.repository.upsertProgress({
        userId,
        videoId: input.videoId,
        completed: score >= 70,
        quizScore: score,
        watchedPercentage: 100
      });

      response.json({ score, correct, total: quiz.length, graded, attempt });
    }
  };
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
