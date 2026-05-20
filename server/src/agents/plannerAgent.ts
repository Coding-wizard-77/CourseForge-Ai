import { z } from "zod";
import { aiClient } from "../services/aiClient.js";
import type { AiProvider } from "../lib/ai/provider.js";
import type { Difficulty, Roadmap } from "../types/course.js";
import { topicToTitle } from "../utils/text.js";

export interface PlannerResult {
  title: string;
  difficulty: Difficulty;
  estimatedHours: number;
  roadmap: Roadmap;
}

export async function planCourse(topic: string, ai: AiProvider = aiClient): Promise<PlannerResult> {
  const fallback = buildFallbackPlan(topic);

  return ai.generateJson<PlannerResult>({
    instructions:
      "You are the Course Planner Agent for CourseForge AI. Build a practical 4-5 module mini-course for a self-paced learner. Use concise module titles, concrete learning outcomes, and YouTube search queries that will find educational lessons.",
    prompt: JSON.stringify({
      topic,
      requiredShape: {
        title: "string",
        difficulty: "beginner | intermediate | advanced",
        estimatedHours: "number",
        roadmap: {
          prerequisites: ["string"],
          modules: [
            {
              title: "string",
              focus: "string",
              outcomes: ["string"],
              searchQuery: "string for YouTube educational search"
            }
          ],
          milestones: ["string"],
          adaptiveTips: ["string"]
        }
      }
    }),
    fallback,
    schema: plannerJsonSchema,
    validate: (value) => PlannerResultSchema.parse(value),
    maxOutputTokens: 2200
  });
}

const PlannerModuleSchema = z.object({
  title: z.string().min(1),
  focus: z.string().min(1),
  outcomes: z.array(z.string().min(1)).min(2),
  searchQuery: z.string().min(1)
});

const PlannerResultSchema = z.object({
  title: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  estimatedHours: z.number().positive(),
  roadmap: z.object({
    prerequisites: z.array(z.string()).default([]),
    modules: z.array(PlannerModuleSchema).min(4).max(5),
    milestones: z.array(z.string()).default([]),
    adaptiveTips: z.array(z.string()).default([])
  })
});

const plannerJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "difficulty", "estimatedHours", "roadmap"],
  properties: {
    title: { type: "string" },
    difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
    estimatedHours: { type: "number" },
    roadmap: {
      type: "object",
      additionalProperties: false,
      required: ["prerequisites", "modules", "milestones", "adaptiveTips"],
      properties: {
        prerequisites: { type: "array", items: { type: "string" } },
        modules: {
          type: "array",
          minItems: 4,
          maxItems: 5,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "focus", "outcomes", "searchQuery"],
            properties: {
              title: { type: "string" },
              focus: { type: "string" },
              outcomes: { type: "array", items: { type: "string" } },
              searchQuery: { type: "string" }
            }
          }
        },
        milestones: { type: "array", items: { type: "string" } },
        adaptiveTips: { type: "array", items: { type: "string" } }
      }
    }
  }
};

function buildFallbackPlan(topic: string): PlannerResult {
  const title = `${topicToTitle(topic)} Mini-Course`;
  const lower = topic.toLowerCase();
  const difficulty: Difficulty =
    lower.includes("advanced") || lower.includes("system design") || lower.includes("neural")
      ? "intermediate"
      : "beginner";

  const moduleBlueprints = [
    {
      title: "Foundations and Vocabulary",
      focus: `Build intuition for ${topic} and identify the words experts use.`,
      outcomes: [`Explain ${topic} in plain language`, "Recognize prerequisite concepts"],
      searchQuery: `${topic} beginner tutorial foundations`
    },
    {
      title: "Core Mechanics",
      focus: `Understand the central rules, patterns, and mental models behind ${topic}.`,
      outcomes: ["Trace how the concept works step by step", "Avoid common beginner misconceptions"],
      searchQuery: `${topic} explained with examples`
    },
    {
      title: "Guided Practice",
      focus: `Apply ${topic} to realistic examples with feedback checkpoints.`,
      outcomes: ["Solve small practice tasks", "Debug mistakes using a repeatable checklist"],
      searchQuery: `${topic} hands on practice examples`
    },
    {
      title: "Assessment and Fluency",
      focus: `Move from recognition to confident problem solving with ${topic}.`,
      outcomes: ["Answer conceptual questions", "Complete a mini assessment"],
      searchQuery: `${topic} quiz interview questions practice`
    },
    {
      title: "Next-Level Roadmap",
      focus: `Connect ${topic} to adjacent skills and long-term learning goals.`,
      outcomes: ["Choose the next lesson path", "Create a revision schedule"],
      searchQuery: `${topic} advanced concepts roadmap`
    }
  ];

  return {
    title,
    difficulty,
    estimatedHours: 5,
    roadmap: {
      prerequisites: ["Basic problem-solving mindset", "A notebook for worked examples"],
      modules: moduleBlueprints,
      milestones: [
        "Explain the concept without notes",
        "Complete every quick quiz at 80% or higher",
        "Build one small example or teaching note"
      ],
      adaptiveTips: [
        "If a quiz score drops below 60%, review the previous module before moving on.",
        "If examples feel easy, skip straight to the mini assessment and advanced roadmap."
      ]
    }
  };
}
