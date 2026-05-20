import { z } from "zod";
import { aiClient } from "../services/aiClient.js";
import type { AiProvider } from "../lib/ai/provider.js";
import type { Flashcard, YouTubeCandidate } from "../types/course.js";

export interface SummaryResult {
  summary: string;
  keyTakeaways: string[];
  flashcards: Flashcard[];
}

export async function summarizeLesson(input: {
  topic: string;
  moduleTitle: string;
  video: YouTubeCandidate;
  ai?: AiProvider;
}): Promise<SummaryResult> {
  const fallback = fallbackSummary(input.topic, input.moduleTitle, input.video);

  return (input.ai ?? aiClient).generateJson<SummaryResult>({
    instructions:
      "You are the Summary Agent. Create concise learner notes from an educational video transcript. Ground the notes in the transcript, avoid unsupported claims, and keep wording useful for self-paced review.",
    prompt: JSON.stringify({
      topic: input.topic,
      moduleTitle: input.moduleTitle,
      videoTitle: input.video.title,
      transcript: input.video.transcript.slice(0, 6000),
      shape: {
        summary: "120-180 word learner-friendly summary",
        keyTakeaways: ["5 short bullets"],
        flashcards: [{ front: "question", back: "answer" }]
      }
    }),
    fallback,
    schema: summaryJsonSchema,
    validate: (value) => SummaryResultSchema.parse(value),
    maxOutputTokens: 1500
  });
}

const FlashcardSchema = z.object({
  front: z.string().min(1),
  back: z.string().min(1)
});

const SummaryResultSchema = z.object({
  summary: z.string().min(1),
  keyTakeaways: z.array(z.string().min(1)).min(3).max(7),
  flashcards: z.array(FlashcardSchema).min(3).max(8)
});

const summaryJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "keyTakeaways", "flashcards"],
  properties: {
    summary: {
      type: "string",
      description: "A 120-180 word learner-friendly transcript-grounded summary."
    },
    keyTakeaways: {
      type: "array",
      minItems: 3,
      maxItems: 7,
      items: { type: "string" }
    },
    flashcards: {
      type: "array",
      minItems: 3,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back"],
        properties: {
          front: { type: "string" },
          back: { type: "string" }
        }
      }
    }
  }
};

function fallbackSummary(topic: string, moduleTitle: string, video: YouTubeCandidate): SummaryResult {
  return {
    summary: `${moduleTitle} focuses on ${topic} through the lesson "${video.title}". The learner starts with the core idea, studies examples, checks for misconceptions, and finishes with a practical way to use the concept independently.`,
    keyTakeaways: [
      `Define the role of ${topic} before memorizing details.`,
      "Use examples to connect vocabulary with real behavior.",
      "Pause after each step and explain what changed.",
      "Common mistakes usually come from skipping prerequisites.",
      "A short practice task is the best test of understanding."
    ],
    flashcards: [
      { front: `What is the first thing to clarify when learning ${topic}?`, back: "The core vocabulary and mental model." },
      { front: "How do you test whether a lesson made sense?", back: "Solve a small example and explain each step aloud." },
      { front: "What should you do after a weak quiz score?", back: "Review the previous concept and retry with a simpler example." }
    ]
  };
}
