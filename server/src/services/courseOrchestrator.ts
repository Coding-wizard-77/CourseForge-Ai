import { researchContent } from "../agents/contentResearchAgent.js";
import { indexCourseTranscripts } from "../agents/embeddingRagAgent.js";
import { buildInitialPersonalization } from "../agents/personalizationAgent.js";
import { planCourse } from "../agents/plannerAgent.js";
import { summarizeLesson } from "../agents/summaryAgent.js";
import { generateQuiz } from "../quizzes/quizGeneratorAgent.js";
import type { AgentTrace, Course, CourseModule, VideoResource } from "../types/course.js";
import { createId } from "../utils/id.js";
import type { VectorStore } from "../vectorDB/vectorStore.js";
import type { CourseRepository } from "../db/repository.js";
import type { AiProvider } from "../lib/ai/provider.js";

export interface CreateCourseInput {
  topic: string;
  userId: string;
  aiClient?: AiProvider;
}

export class CourseOrchestrator {
  constructor(
    private readonly repository: CourseRepository,
    private readonly vectorStore: VectorStore
  ) {}

  async createCourse(input: CreateCourseInput) {
    const trace: AgentTrace[] = [];
    const startedAt = new Date().toISOString();
    const ai = input.aiClient;
    const planner = await tracked(trace, "Course Planner Agent", "Generated roadmap and prerequisites", () =>
      planCourse(input.topic, ai)
    );

    const researched = await tracked(trace, "Content Research Agent", "Searched and ranked YouTube resources", () =>
      researchContent(input.topic, planner.roadmap.modules, ai)
    );

    const courseId = createId("course");
    const modules: CourseModule[] = [];

    for (const [moduleIndex, plannedModule] of planner.roadmap.modules.entries()) {
      const moduleId = createId("module");
      const selectedVideos = researched[moduleIndex] ?? [];
      const videos: VideoResource[] = [];

      for (const candidate of selectedVideos) {
        const videoId = createId("video");
        const summary = await summarizeLesson({
          topic: input.topic,
          moduleTitle: plannedModule.title,
          video: candidate,
          ai
        });
        const quiz = await generateQuiz({
          topic: input.topic,
          videoId,
          moduleTitle: plannedModule.title,
          difficulty: planner.difficulty,
          video: candidate,
          ai
        });

        videos.push({
          id: videoId,
          moduleId,
          youtubeVideoId: candidate.youtubeVideoId,
          title: candidate.title,
          url: candidate.url,
          duration: candidate.duration,
          thumbnail: candidate.thumbnail,
          channelTitle: candidate.channelTitle,
          views: candidate.views,
          likes: candidate.likes,
          transcript: candidate.transcript,
          semanticScore: candidate.semanticScore,
          qualityScore: candidate.qualityScore,
          summary: summary.summary,
          keyTakeaways: summary.keyTakeaways,
          flashcards: summary.flashcards,
          quiz
        });
      }

      modules.push({
        id: moduleId,
        courseId,
        title: plannedModule.title,
        moduleOrder: moduleIndex + 1,
        summary: plannedModule.focus,
        learningObjectives: plannedModule.outcomes,
        videos
      });
    }

    trace.push({
      agent: "Quiz Generator Agent",
      status: "complete",
      message: "Generated quick checks and mini assessments for every lesson",
      completedAt: new Date().toISOString()
    });
    trace.push({
      agent: "Summary Agent",
      status: "complete",
      message: "Created notes, key takeaways, and flashcards",
      completedAt: new Date().toISOString()
    });

    const personalization = buildInitialPersonalization({
      difficulty: planner.difficulty,
      modules
    });

    trace.push({
      agent: "Personalization Agent",
      status: "complete",
      message: "Prepared adaptive next actions and spaced repetition checkpoints",
      completedAt: new Date().toISOString()
    });

    const course: Course = {
      id: courseId,
      userId: input.userId,
      title: planner.title,
      topic: input.topic,
      difficulty: planner.difficulty,
      estimatedHours: planner.estimatedHours,
      createdAt: startedAt,
      roadmap: planner.roadmap,
      modules,
      agentsTrace: trace,
      personalization
    };

    const chunks = await tracked(trace, "Embedding/RAG Agent", "Chunked transcripts and indexed semantic vectors", () =>
      indexCourseTranscripts(course, this.vectorStore, ai)
    );
    trace[trace.length - 1].message = `Indexed ${chunks} transcript chunks for lesson chat and semantic retrieval`;

    await this.repository.saveCourse(course);
    return course;
  }
}

async function tracked<T>(
  trace: AgentTrace[],
  agent: string,
  message: string,
  task: () => Promise<T>
) {
  try {
    const result = await task();
    trace.push({
      agent,
      status: "complete",
      message,
      completedAt: new Date().toISOString()
    });
    return result;
  } catch (error) {
    trace.push({
      agent,
      status: "fallback",
      message: `${message}; fallback path used after ${error instanceof Error ? error.message : "an unknown error"}`,
      completedAt: new Date().toISOString()
    });
    throw error;
  }
}
