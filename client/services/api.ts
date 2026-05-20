import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import type { AuthUser, Course, QuizQuestion, UserProgress } from "@/services/types";

export const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 120_000,
  withCredentials: true
});

export const demoUserId = process.env.NEXT_PUBLIC_DEMO_USER_ID ?? "demo-user";

let refreshPromise: Promise<AuthUser> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const request = error.config as RetriableRequestConfig | undefined;
    const url = request?.url ?? "";

    if (status !== 401 || !request || request._retry || url.includes("/api/auth/login") || url.includes("/api/auth/signup") || url.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    request._retry = true;
    refreshPromise ??= refreshSession().finally(() => {
      refreshPromise = null;
    });
    await refreshPromise;
    return api(request);
  }
);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong.") {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

export async function signup(input: { name?: string; email: string; password: string }) {
  const response = await api.post<{ user: AuthUser }>("/api/auth/signup", input);
  return response.data.user;
}

export async function login(input: { email: string; password: string }) {
  const response = await api.post<{ user: AuthUser }>("/api/auth/login", input);
  return response.data.user;
}

export async function getCurrentUser() {
  const response = await api.get<{ user: AuthUser }>("/api/auth/me");
  return response.data.user;
}

export async function refreshSession() {
  const response = await api.post<{ user: AuthUser }>("/api/auth/refresh");
  return response.data.user;
}

export async function logout() {
  await api.post("/api/auth/logout");
}

export function getGoogleOAuthUrl() {
  return `${apiBaseUrl}/api/auth/google`;
}

function withGeminiKey(apiKey?: string) {
  return apiKey ? { headers: { "X-Gemini-Api-Key": apiKey } } : undefined;
}

export async function createCourse(topic: string, userId = demoUserId, geminiApiKey?: string) {
  const response = await api.post<{ course: Course }>("/api/course/create", { topic, userId }, withGeminiKey(geminiApiKey));
  return response.data.course;
}

export async function getCourse(id: string) {
  const response = await api.get<{ course: Course }>(`/api/course/${id}`);
  return response.data.course;
}

export async function listUserCourses(userId = demoUserId) {
  const response = await api.get<{ courses: Course[] }>(`/api/course/user/${userId}`);
  return response.data.courses;
}

export async function listUserProgress(userId = demoUserId) {
  const response = await api.get<{ progress: UserProgress[] }>(`/api/progress/user/${userId}`);
  return response.data.progress;
}

export async function submitQuiz(input: {
  userId?: string;
  videoId: string;
  answers: Record<string, string>;
}) {
  const response = await api.post<{
    score: number;
    correct: number;
    total: number;
    graded: Array<{
      questionId: string;
      answer: string;
      correctAnswer: string;
      isCorrect: boolean;
      explanation: string;
    }>;
  }>("/api/quiz/submit", { userId: demoUserId, ...input });
  return response.data;
}

export async function getQuiz(videoId: string) {
  const response = await api.get<{ quiz: QuizQuestion[] }>(`/api/quiz/${videoId}`);
  return response.data.quiz;
}

export async function updateProgress(input: {
  videoId: string;
  completed: boolean;
  quizScore?: number;
  watchedPercentage?: number;
  userId?: string;
}) {
  const response = await api.post<{ progress: UserProgress }>("/api/progress/update", {
    userId: demoUserId,
    quizScore: 0,
    watchedPercentage: 0,
    ...input
  });
  return response.data.progress;
}

export async function askLessonAssistant(input: {
  courseId: string;
  videoId?: string;
  question: string;
}, geminiApiKey?: string) {
  const response = await api.post<{
    answer: string;
    sources: Array<{ videoId: string; moduleId: string; videoTitle: string; score: number }>;
  }>("/api/chat/lesson", input, withGeminiKey(geminiApiKey));
  return response.data;
}
