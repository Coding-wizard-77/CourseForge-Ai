import type { AppRepository } from "./repository.js";
import type { AuthSessionRecord, AuthUserRecord } from "../types/auth.js";
import type { Course, QuizAttempt, QuizQuestion, UserProgress, VideoResource } from "../types/course.js";
import { createId } from "../utils/id.js";

export class MemoryRepository implements AppRepository {
  private courses = new Map<string, Course>();
  private progress = new Map<string, UserProgress>();
  private attempts: QuizAttempt[] = [];
  private users = new Map<string, AuthUserRecord>();
  private sessions = new Map<string, AuthSessionRecord>();

  async init() {}

  async saveCourse(course: Course) {
    this.courses.set(course.id, structuredClone(course));
    return course;
  }

  async getCourse(id: string) {
    const course = this.courses.get(id);
    return course ? structuredClone(course) : null;
  }

  async listUserCourses(userId: string) {
    return Array.from(this.courses.values())
      .filter((course) => course.userId === userId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .map((course) => structuredClone(course));
  }

  async getVideosByModule(moduleId: string) {
    return this.findVideos((video) => video.moduleId === moduleId);
  }

  async getQuizByVideo(videoId: string) {
    const video = this.findVideos((item) => item.id === videoId)[0];
    return video?.quiz ?? [];
  }

  async upsertProgress(progress: Omit<UserProgress, "id" | "updatedAt">) {
    const key = `${progress.userId}:${progress.videoId}`;
    const saved: UserProgress = {
      id: this.progress.get(key)?.id ?? createId("progress"),
      ...progress,
      updatedAt: new Date().toISOString()
    };
    this.progress.set(key, saved);
    return saved;
  }

  async getProgressForUser(userId: string) {
    return Array.from(this.progress.values()).filter((progress) => progress.userId === userId);
  }

  async saveQuizAttempt(attempt: Omit<QuizAttempt, "id" | "submittedAt">) {
    const saved: QuizAttempt = {
      id: createId("attempt"),
      ...attempt,
      submittedAt: new Date().toISOString()
    };
    this.attempts.push(saved);
    return saved;
  }

  async getQuizAttempts(userId: string) {
    return this.attempts.filter((attempt) => attempt.userId === userId);
  }

  async createAuthUser(input: {
    email: string;
    name?: string | null;
    passwordHash?: string | null;
    avatarUrl?: string | null;
    googleId?: string | null;
    authProvider: AuthUserRecord["authProvider"];
  }) {
    const email = normalizeEmail(input.email);
    if (await this.findAuthUserByEmail(email)) {
      throw new Error("Email is already registered");
    }

    const user: AuthUserRecord = {
      id: createId("user"),
      email,
      name: input.name ?? null,
      passwordHash: input.passwordHash ?? null,
      avatarUrl: input.avatarUrl ?? null,
      googleId: input.googleId ?? null,
      authProvider: input.authProvider,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.users.set(user.id, user);
    return structuredClone(user);
  }

  async findAuthUserById(id: string) {
    const user = this.users.get(id);
    return user ? structuredClone(user) : null;
  }

  async findAuthUserByEmail(email: string) {
    const normalized = normalizeEmail(email);
    const user = Array.from(this.users.values()).find((item) => item.email === normalized);
    return user ? structuredClone(user) : null;
  }

  async findAuthUserByGoogleId(googleId: string) {
    const user = Array.from(this.users.values()).find((item) => item.googleId === googleId);
    return user ? structuredClone(user) : null;
  }

  async upsertOAuthUser(input: { email: string; name?: string | null; avatarUrl?: string | null; googleId: string }) {
    const email = normalizeEmail(input.email);
    const existing = (await this.findAuthUserByGoogleId(input.googleId)) ?? (await this.findAuthUserByEmail(email));

    if (existing) {
      const updated: AuthUserRecord = {
        ...existing,
        email,
        name: input.name ?? existing.name,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        googleId: input.googleId,
        authProvider: existing.passwordHash ? "credentials" : "google",
        updatedAt: new Date().toISOString()
      };
      this.users.set(updated.id, updated);
      return structuredClone(updated);
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
    const session: AuthSessionRecord = {
      id: createId("session"),
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      createdAt: new Date().toISOString(),
      expiresAt: input.expiresAt,
      revokedAt: null
    };
    this.sessions.set(session.id, session);
    return structuredClone(session);
  }

  async findAuthSessionById(id: string) {
    const session = this.sessions.get(id);
    return session ? structuredClone(session) : null;
  }

  async findAuthSessionByRefreshHash(refreshTokenHash: string) {
    const session = Array.from(this.sessions.values()).find((item) => item.refreshTokenHash === refreshTokenHash);
    return session ? structuredClone(session) : null;
  }

  async revokeAuthSession(id: string) {
    const session = this.sessions.get(id);
    if (session && !session.revokedAt) {
      this.sessions.set(id, { ...session, revokedAt: new Date().toISOString() });
    }
  }

  async revokeAuthSessionsForUser(userId: string) {
    const revokedAt = new Date().toISOString();
    for (const [id, session] of this.sessions) {
      if (session.userId === userId && !session.revokedAt) {
        this.sessions.set(id, { ...session, revokedAt });
      }
    }
  }

  private findVideos(predicate: (video: VideoResource) => boolean) {
    return Array.from(this.courses.values())
      .flatMap((course) => course.modules)
      .flatMap((module) => module.videos)
      .filter(predicate)
      .map((video) => structuredClone(video));
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
