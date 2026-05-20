export type Difficulty = "beginner" | "intermediate" | "advanced";

export interface AgentTrace {
  agent: string;
  status: "queued" | "running" | "complete" | "fallback";
  message: string;
  completedAt?: string;
}

export interface Roadmap {
  prerequisites: string[];
  modules: Array<{
    title: string;
    focus: string;
    outcomes: string[];
    searchQuery: string;
  }>;
  milestones: string[];
  adaptiveTips: string[];
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  id: string;
  videoId: string;
  type: "mcq" | "true_false" | "fill_blank" | "coding" | "conceptual";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: Difficulty;
}

export interface VideoResource {
  id: string;
  moduleId: string;
  youtubeVideoId: string;
  title: string;
  url: string;
  duration: string;
  thumbnail: string;
  channelTitle: string;
  views: number;
  likes: number;
  transcript: string;
  semanticScore: number;
  qualityScore: number;
  summary: string;
  keyTakeaways: string[];
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  moduleOrder: number;
  summary: string;
  learningObjectives: string[];
  videos: VideoResource[];
}

export interface PersonalizationPlan {
  currentLevel: Difficulty;
  weakAreas: string[];
  nextActions: string[];
  revisionSchedule: Array<{
    topic: string;
    dueInDays: number;
    reason: string;
  }>;
}

export interface Course {
  id: string;
  userId: string;
  title: string;
  topic: string;
  difficulty: Difficulty;
  estimatedHours: number;
  createdAt: string;
  roadmap: Roadmap;
  modules: CourseModule[];
  agentsTrace: AgentTrace[];
  personalization: PersonalizationPlan;
}

export interface UserProgress {
  id: string;
  userId: string;
  videoId: string;
  completed: boolean;
  quizScore: number;
  watchedPercentage: number;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  authProvider: "credentials" | "google" | "demo";
  createdAt: string;
}
