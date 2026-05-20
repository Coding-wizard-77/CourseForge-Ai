import type { Course, QuizAttempt, QuizQuestion, UserProgress, VideoResource } from "../types/course.js";
import type { AuthProvider, AuthSessionRecord, AuthUserRecord } from "../types/auth.js";

export interface CourseRepository {
  init(): Promise<void>;
  saveCourse(course: Course): Promise<Course>;
  getCourse(id: string): Promise<Course | null>;
  listUserCourses(userId: string): Promise<Course[]>;
  getVideosByModule(moduleId: string): Promise<VideoResource[]>;
  getQuizByVideo(videoId: string): Promise<QuizQuestion[]>;
  upsertProgress(progress: Omit<UserProgress, "id" | "updatedAt">): Promise<UserProgress>;
  getProgressForUser(userId: string): Promise<UserProgress[]>;
  saveQuizAttempt(attempt: Omit<QuizAttempt, "id" | "submittedAt">): Promise<QuizAttempt>;
  getQuizAttempts(userId: string): Promise<QuizAttempt[]>;
}

export interface AuthRepository {
  createAuthUser(input: {
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    avatarUrl?: string | null;
    googleId?: string | null;
    authProvider: AuthProvider;
  }): Promise<AuthUserRecord>;
  findAuthUserById(id: string): Promise<AuthUserRecord | null>;
  findAuthUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findAuthUserByGoogleId(googleId: string): Promise<AuthUserRecord | null>;
  upsertOAuthUser(input: {
    email: string;
    name?: string | null;
    avatarUrl?: string | null;
    googleId: string;
  }): Promise<AuthUserRecord>;
  createAuthSession(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: string;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): Promise<AuthSessionRecord>;
  findAuthSessionById(id: string): Promise<AuthSessionRecord | null>;
  findAuthSessionByRefreshHash(refreshTokenHash: string): Promise<AuthSessionRecord | null>;
  revokeAuthSession(id: string): Promise<void>;
  revokeAuthSessionsForUser(userId: string): Promise<void>;
}

export type AppRepository = CourseRepository & AuthRepository;
