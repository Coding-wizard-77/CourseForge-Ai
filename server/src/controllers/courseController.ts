import type { Request, Response } from "express";
import { z } from "zod";
import type { AppContext } from "../types/app.js";
import { AppError } from "../utils/errors.js";
import { getRequestAiClient } from "../services/requestAiClient.js";

const CreateCourseSchema = z.object({
  topic: z.string().trim().min(2),
  userId: z.string().trim().optional()
});

export function createCourseController(context: AppContext) {
  return {
    createCourse: async (request: Request, response: Response) => {
      const input = CreateCourseSchema.parse(request.body);
      const course = await context.orchestrator.createCourse({
        topic: input.topic,
        userId: request.auth?.user.id ?? input.userId ?? "demo-user",
        aiClient: getRequestAiClient(request)
      });
      response.status(201).json({ course });
    },

    getCourse: async (request: Request, response: Response) => {
      const id = z.string().parse(request.params.id);
      const course = await context.repository.getCourse(id);
      if (!course) {
        response.status(404).json({ message: "Course not found" });
        return;
      }
      if (request.auth && course.userId !== request.auth.user.id) {
        throw new AppError("You do not have access to this course.", 403, "COURSE_FORBIDDEN");
      }
      response.json({ course });
    },

    listUserCourses: async (request: Request, response: Response) => {
      const requestedUserId = z.string().parse(request.params.userId);
      const userId = request.auth?.user.id ?? requestedUserId;
      if (request.auth && requestedUserId !== "me" && requestedUserId !== request.auth.user.id) {
        throw new AppError("You cannot list another user's courses.", 403, "COURSE_LIST_FORBIDDEN");
      }
      const courses = await context.repository.listUserCourses(userId);
      response.json({ courses });
    }
  };
}
