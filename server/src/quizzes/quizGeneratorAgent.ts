import { z } from "zod";
import { aiClient } from "../services/aiClient.js";
import type { AiProvider } from "../lib/ai/provider.js";
import type { Difficulty, QuizQuestion, YouTubeCandidate } from "../types/course.js";
import { createId } from "../utils/id.js";

export async function generateQuiz(input: {
  topic: string;
  videoId: string;
  moduleTitle: string;
  difficulty: Difficulty;
  video: YouTubeCandidate;
  ai?: AiProvider;
}): Promise<QuizQuestion[]> {
  const fallback = fallbackQuiz(input.topic, input.videoId, input.difficulty);

  const questions = await (input.ai ?? aiClient).generateJson<Omit<QuizQuestion, "id" | "videoId">[]>({
    instructions:
      "You are the Quiz Generator Agent. Generate varied, fair assessments from a lesson transcript. Use only transcript-supported concepts, avoid trick questions, and make explanations concise.",
    prompt: JSON.stringify({
      topic: input.topic,
      moduleTitle: input.moduleTitle,
      difficulty: input.difficulty,
      videoTitle: input.video.title,
      transcript: input.video.transcript.slice(0, 6500),
      requirements: [
        "Generate exactly 6 questions",
        "Use a mix of mcq, true_false, fill_blank, coding, and conceptual when appropriate",
        "Each MCQ must include 4 options",
        "Every question needs a concise explanation"
      ],
      shape: [
        {
          type: "mcq | true_false | fill_blank | coding | conceptual",
          question: "string",
          options: ["string"],
          correctAnswer: "string",
          explanation: "string",
          difficulty: input.difficulty
        }
      ]
    }),
    fallback: fallback.map(({ id: _id, videoId: _videoId, ...question }) => question),
    schema: quizJsonSchema,
    validate: (value) => GeneratedQuizSchema.parse(value),
    maxOutputTokens: 1800
  });

  return questions.slice(0, 6).map((question) => ({
    ...question,
    id: createId("quiz"),
    videoId: input.videoId,
    options: Array.isArray(question.options) ? question.options : [],
    difficulty: question.difficulty ?? input.difficulty
  }));
}

const GeneratedQuestionSchema = z.object({
  type: z.enum(["mcq", "true_false", "fill_blank", "coding", "conceptual"]),
  question: z.string().min(1),
  options: z.array(z.string()).default([]),
  correctAnswer: z.string().min(1),
  explanation: z.string().min(1),
  difficulty: z.enum(["beginner", "intermediate", "advanced"])
});

const GeneratedQuizSchema = z.array(GeneratedQuestionSchema).min(1).max(8);

const quizJsonSchema = {
  type: "array",
  minItems: 6,
  maxItems: 6,
  items: {
    type: "object",
    additionalProperties: false,
    required: ["type", "question", "options", "correctAnswer", "explanation", "difficulty"],
    properties: {
      type: { type: "string", enum: ["mcq", "true_false", "fill_blank", "coding", "conceptual"] },
      question: { type: "string" },
      options: {
        type: "array",
        items: { type: "string" },
        description: "Four options for mcq, True/False options for true_false, otherwise an empty array."
      },
      correctAnswer: { type: "string" },
      explanation: { type: "string" },
      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] }
    }
  }
};

function fallbackQuiz(topic: string, videoId: string, difficulty: Difficulty): QuizQuestion[] {
  const base = [
    {
      type: "mcq" as const,
      question: `Which study move is most useful when first learning ${topic}?`,
      options: ["Memorize definitions only", "Build a mental model with examples", "Skip prerequisites", "Avoid practice"],
      correctAnswer: "Build a mental model with examples",
      explanation: "A concept becomes usable when definitions are connected to worked examples."
    },
    {
      type: "true_false" as const,
      question: `True or false: You should be able to explain ${topic} in plain language before moving to advanced material.`,
      options: ["True", "False"],
      correctAnswer: "True",
      explanation: "Plain-language explanation is a strong signal that the mental model is forming."
    },
    {
      type: "fill_blank" as const,
      question: "A good revision session should target the learner's weakest ____ first.",
      options: [],
      correctAnswer: "area",
      explanation: "Adaptive learning improves fastest when weak areas are reviewed intentionally."
    },
    {
      type: "conceptual" as const,
      question: `Name one misconception a beginner might have about ${topic}.`,
      options: [],
      correctAnswer: "Answers should identify a plausible misconception and correct it.",
      explanation: "Conceptual questions check whether the learner can reason beyond recognition."
    },
    {
      type: "coding" as const,
      question: `Create a tiny example or pseudocode snippet that demonstrates ${topic}.`,
      options: [],
      correctAnswer: "A valid answer includes a minimal example and explains why it demonstrates the concept.",
      explanation: "Producing an example proves transfer from passive watching to active use."
    },
    {
      type: "mcq" as const,
      question: "What is the best next action after scoring poorly on a quick quiz?",
      options: ["Move ahead immediately", "Review the relevant lesson segment", "Delete the course", "Only watch advanced videos"],
      correctAnswer: "Review the relevant lesson segment",
      explanation: "Targeted review closes gaps before they compound."
    }
  ];

  return base.map((question) => ({
    ...question,
    id: createId("quiz"),
    videoId,
    difficulty
  }));
}
