import type { AppRepository } from "./repository.js";
import { prisma } from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";
import type { AuthProvider, AuthSessionRecord, AuthUserRecord } from "../types/auth.js";
import type { Course, CourseModule, Difficulty, QuizAttempt, QuizQuestion, UserProgress, VideoResource } from "../types/course.js";
import { createId } from "../utils/id.js";

export class PrismaRepository implements AppRepository {
  async init() {
    await prisma.$connect();
  }

  async saveCourse(course: Course) {
    await prisma.user.upsert({
      where: { id: course.userId },
      update: {},
      create: {
        id: course.userId,
        name: "Demo Learner",
        email: `${course.userId}@courseforge.local`
      }
    });

    await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: course.title,
        topic: course.topic,
        difficulty: course.difficulty,
        estimatedHours: course.estimatedHours,
        roadmap: toJson(course.roadmap),
        agentsTrace: toJson(course.agentsTrace),
        personalization: toJson(course.personalization),
        modules: {
          deleteMany: {},
          create: course.modules.map((module) => ({
            id: module.id,
            title: module.title,
            moduleOrder: module.moduleOrder,
            summary: module.summary,
            learningObjectives: toJson(module.learningObjectives),
            videos: {
              create: module.videos.map((video) => ({
                id: video.id,
                youtubeVideoId: video.youtubeVideoId,
                title: video.title,
                url: video.url,
                duration: video.duration,
                thumbnail: video.thumbnail,
                channelTitle: video.channelTitle,
                views: video.views,
                likes: video.likes,
                transcript: video.transcript,
                semanticScore: video.semanticScore,
                qualityScore: video.qualityScore,
                summary: video.summary,
                keyTakeaways: toJson(video.keyTakeaways),
                flashcards: toJson(video.flashcards),
                quizzes: {
                  create: video.quiz.map((quiz) => ({
                    id: quiz.id,
                    type: quiz.type,
                    question: quiz.question,
                    options: toJson(quiz.options),
                    correctAnswer: quiz.correctAnswer,
                    explanation: quiz.explanation,
                    difficulty: quiz.difficulty
                  }))
                }
              }))
            }
          }))
        }
      },
      create: {
        id: course.id,
        userId: course.userId,
        title: course.title,
        topic: course.topic,
        difficulty: course.difficulty,
        estimatedHours: course.estimatedHours,
        roadmap: toJson(course.roadmap),
        agentsTrace: toJson(course.agentsTrace),
        personalization: toJson(course.personalization),
        createdAt: new Date(course.createdAt),
        modules: {
          create: course.modules.map((module) => ({
            id: module.id,
            title: module.title,
            moduleOrder: module.moduleOrder,
            summary: module.summary,
            learningObjectives: toJson(module.learningObjectives),
            videos: {
              create: module.videos.map((video) => ({
                id: video.id,
                youtubeVideoId: video.youtubeVideoId,
                title: video.title,
                url: video.url,
                duration: video.duration,
                thumbnail: video.thumbnail,
                channelTitle: video.channelTitle,
                views: video.views,
                likes: video.likes,
                transcript: video.transcript,
                semanticScore: video.semanticScore,
                qualityScore: video.qualityScore,
                summary: video.summary,
                keyTakeaways: toJson(video.keyTakeaways),
                flashcards: toJson(video.flashcards),
                quizzes: {
                  create: video.quiz.map((quiz) => ({
                    id: quiz.id,
                    type: quiz.type,
                    question: quiz.question,
                    options: toJson(quiz.options),
                    correctAnswer: quiz.correctAnswer,
                    explanation: quiz.explanation,
                    difficulty: quiz.difficulty
                  }))
                }
              }))
            }
          }))
        }
      }
    });

    return course;
  }

  async getCourse(id: string) {
    const course = await prisma.course.findUnique({
      where: { id },
      include: includeCourseTree
    });

    return course ? mapCourse(course) : null;
  }

  async listUserCourses(userId: string) {
    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: includeCourseTree
    });

    return courses.map(mapCourse);
  }

  async getVideosByModule(moduleId: string) {
    const videos = await prisma.video.findMany({
      where: { moduleId },
      orderBy: { qualityScore: "desc" },
      include: { quizzes: true }
    });

    return videos.map(mapVideo);
  }

  async getQuizByVideo(videoId: string) {
    const quiz = await prisma.quiz.findMany({ where: { videoId } });
    return quiz.map(mapQuiz);
  }

  async upsertProgress(progress: Omit<UserProgress, "id" | "updatedAt">) {
    const saved = await prisma.userProgress.upsert({
      where: {
        userId_videoId: {
          userId: progress.userId,
          videoId: progress.videoId
        }
      },
      update: {
        completed: progress.completed,
        quizScore: progress.quizScore,
        watchedPercentage: progress.watchedPercentage
      },
      create: {
        id: createId("progress"),
        userId: progress.userId,
        videoId: progress.videoId,
        completed: progress.completed,
        quizScore: progress.quizScore,
        watchedPercentage: progress.watchedPercentage
      }
    });

    return mapProgress(saved);
  }

  async getProgressForUser(userId: string) {
    const progress = await prisma.userProgress.findMany({ where: { userId } });
    return progress.map(mapProgress);
  }

  async saveQuizAttempt(attempt: Omit<QuizAttempt, "id" | "submittedAt">) {
    const saved = await prisma.quizAttempt.create({
      data: {
        id: createId("attempt"),
        userId: attempt.userId,
        videoId: attempt.videoId,
        score: attempt.score,
        total: attempt.total,
        weakAreas: toJson(attempt.weakAreas)
      }
    });

    return mapAttempt(saved);
  }

  async getQuizAttempts(userId: string) {
    const attempts = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" }
    });

    return attempts.map(mapAttempt);
  }

  async createAuthUser(input: {
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    avatarUrl?: string | null;
    googleId?: string | null;
    authProvider: AuthProvider;
  }) {
    const user = await prisma.user.create({
      data: {
        id: createId("user"),
        email: normalizeEmail(input.email),
        name: input.name ?? null,
        passwordHash: input.passwordHash ?? null,
        avatarUrl: input.avatarUrl ?? null,
        googleId: input.googleId ?? null,
        authProvider: input.authProvider
      }
    });

    return mapAuthUser(user);
  }

  async findAuthUserById(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? mapAuthUser(user) : null;
  }

  async findAuthUserByEmail(email: string) {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    return user ? mapAuthUser(user) : null;
  }

  async findAuthUserByGoogleId(googleId: string) {
    const user = await prisma.user.findUnique({ where: { googleId } });
    return user ? mapAuthUser(user) : null;
  }

  async upsertOAuthUser(input: { email: string; name?: string | null; avatarUrl?: string | null; googleId: string }) {
    const email = normalizeEmail(input.email);
    const existing = (await this.findAuthUserByGoogleId(input.googleId)) ?? (await this.findAuthUserByEmail(email));

    if (existing) {
      const user = await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          name: input.name ?? existing.name,
          avatarUrl: input.avatarUrl ?? existing.avatarUrl,
          googleId: input.googleId,
          authProvider: existing.passwordHash ? "credentials" : "google"
        }
      });
      return mapAuthUser(user);
    }

    return this.createAuthUser({
      email,
      name: input.name,
      avatarUrl: input.avatarUrl,
      googleId: input.googleId,
      authProvider: "google"
    });
  }

  async createAuthSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) {
    const session = await prisma.authSession.create({
      data: {
        id: createId("session"),
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        expiresAt: new Date(input.expiresAt),
        userAgent: input.userAgent ?? null,
        ipAddress: input.ipAddress ?? null
      }
    });

    return mapAuthSession(session);
  }

  async findAuthSessionById(id: string) {
    const session = await prisma.authSession.findUnique({ where: { id } });
    return session ? mapAuthSession(session) : null;
  }

  async findAuthSessionByRefreshHash(refreshTokenHash: string) {
    const session = await prisma.authSession.findUnique({ where: { refreshTokenHash } });
    return session ? mapAuthSession(session) : null;
  }

  async revokeAuthSession(id: string) {
    await prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }

  async revokeAuthSessionsForUser(userId: string) {
    await prisma.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() }
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

const includeCourseTree = {
  modules: {
    orderBy: { moduleOrder: "asc" as const },
    include: {
      videos: {
        orderBy: { qualityScore: "desc" as const },
        include: { quizzes: true }
      }
    }
  }
};

function mapCourse(course: any): Course {
  return {
    id: course.id,
    userId: course.userId,
    title: course.title,
    topic: course.topic,
    difficulty: course.difficulty as Difficulty,
    estimatedHours: course.estimatedHours,
    createdAt: course.createdAt.toISOString(),
    roadmap: course.roadmap,
    agentsTrace: course.agentsTrace,
    personalization: course.personalization,
    modules: course.modules.map(mapModule)
  };
}

function mapModule(module: any): CourseModule {
  return {
    id: module.id,
    courseId: module.courseId,
    title: module.title,
    moduleOrder: module.moduleOrder,
    summary: module.summary,
    learningObjectives: module.learningObjectives,
    videos: module.videos.map(mapVideo)
  };
}

function mapVideo(video: any): VideoResource {
  return {
    id: video.id,
    moduleId: video.moduleId,
    youtubeVideoId: video.youtubeVideoId,
    title: video.title,
    url: video.url,
    duration: video.duration ?? "",
    thumbnail: video.thumbnail ?? "",
    channelTitle: video.channelTitle ?? "",
    views: video.views ?? 0,
    likes: video.likes ?? 0,
    transcript: video.transcript ?? "",
    semanticScore: video.semanticScore ?? 0,
    qualityScore: video.qualityScore ?? 0,
    summary: video.summary ?? "",
    keyTakeaways: video.keyTakeaways ?? [],
    flashcards: video.flashcards ?? [],
    quiz: (video.quizzes ?? []).map(mapQuiz)
  };
}

function mapQuiz(quiz: any): QuizQuestion {
  return {
    id: quiz.id,
    videoId: quiz.videoId,
    type: quiz.type,
    question: quiz.question,
    options: quiz.options ?? [],
    correctAnswer: quiz.correctAnswer,
    explanation: quiz.explanation,
    difficulty: quiz.difficulty
  };
}

function mapProgress(progress: any): UserProgress {
  return {
    id: progress.id,
    userId: progress.userId,
    videoId: progress.videoId,
    completed: progress.completed,
    quizScore: progress.quizScore,
    watchedPercentage: progress.watchedPercentage,
    updatedAt: progress.updatedAt.toISOString()
  };
}

function mapAttempt(attempt: any): QuizAttempt {
  return {
    id: attempt.id,
    userId: attempt.userId,
    videoId: attempt.videoId,
    score: attempt.score,
    total: attempt.total,
    weakAreas: attempt.weakAreas ?? [],
    submittedAt: attempt.submittedAt.toISOString()
  };
}

function mapAuthUser(user: any): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    passwordHash: user.passwordHash ?? null,
    avatarUrl: user.avatarUrl ?? null,
    googleId: user.googleId ?? null,
    authProvider: (user.authProvider ?? "credentials") as AuthProvider,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt?.toISOString()
  };
}

function mapAuthSession(session: any): AuthSessionRecord {
  return {
    id: session.id,
    userId: session.userId,
    refreshTokenHash: session.refreshTokenHash,
    userAgent: session.userAgent ?? null,
    ipAddress: session.ipAddress ?? null,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
