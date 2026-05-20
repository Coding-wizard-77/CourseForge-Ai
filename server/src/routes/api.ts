import { Router } from "express";
import { createAuthController } from "../controllers/authController.js";
import { createChatController } from "../controllers/chatController.js";
import { createCourseController } from "../controllers/courseController.js";
import { createProgressController } from "../controllers/progressController.js";
import { createQuizController } from "../controllers/quizController.js";
import { createVideoController } from "../controllers/videoController.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";
import { runStartupValidation } from "../services/startupValidator.js";
import type { AppContext } from "../types/app.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export function createApiRouter(context: AppContext) {
  const router = Router();
  const auth = createAuthController(context);
  const course = createCourseController(context);
  const video = createVideoController(context);
  const quiz = createQuizController(context);
  const progress = createProgressController(context);
  const chat = createChatController(context);

  router.get("/health", (_request, response) => {
    response.json({ ok: true, service: "CourseForge AI API" });
  });

  router.get(
    "/diagnostics",
    asyncHandler(async (_request, response) => {
      response.json(await runStartupValidation());
    })
  );

  router.post("/auth/signup", asyncHandler(auth.signup));
  router.post("/auth/login", asyncHandler(auth.login));
  router.post("/auth/refresh", asyncHandler(auth.refresh));
  router.post("/auth/logout", asyncHandler(auth.logout));
  router.get("/auth/me", requireAuth(context.repository), asyncHandler(auth.me));
  router.get("/auth/google", asyncHandler(auth.googleStart));
  router.get("/auth/google/callback", asyncHandler(auth.googleCallback));

  router.post("/course/create", optionalAuth(context.repository), asyncHandler(course.createCourse));
  router.get("/course/:id", optionalAuth(context.repository), asyncHandler(course.getCourse));
  router.get("/course/user/:userId", optionalAuth(context.repository), asyncHandler(course.listUserCourses));
  router.get("/videos/:moduleId", optionalAuth(context.repository), asyncHandler(video.getVideosByModule));
  router.get("/quiz/:videoId", optionalAuth(context.repository), asyncHandler(quiz.getQuizByVideo));
  router.post("/quiz/submit", optionalAuth(context.repository), asyncHandler(quiz.submitQuiz));
  router.post("/progress/update", optionalAuth(context.repository), asyncHandler(progress.updateProgress));
  router.get("/progress/user/:userId", optionalAuth(context.repository), asyncHandler(progress.getUserProgress));
  router.post("/chat/lesson", optionalAuth(context.repository), asyncHandler(chat.askLessonAssistant));

  return router;
}
