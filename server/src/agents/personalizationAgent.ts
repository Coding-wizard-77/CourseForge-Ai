import type { CourseModule, Difficulty, PersonalizationPlan, QuizAttempt } from "../types/course.js";

export function buildInitialPersonalization(input: {
  difficulty: Difficulty;
  modules: CourseModule[];
}): PersonalizationPlan {
  return {
    currentLevel: input.difficulty,
    weakAreas: [],
    nextActions: [
      `Start with ${input.modules[0]?.title ?? "the first module"} and complete the quick quiz.`,
      "Review every incorrect answer explanation before watching the next lesson.",
      "Use the lesson chat when a definition feels fuzzy."
    ],
    revisionSchedule: input.modules.slice(0, 3).map((module, index) => ({
      topic: module.title,
      dueInDays: [1, 3, 7][index] ?? 7,
      reason: "Spaced repetition checkpoint"
    }))
  };
}

export function updatePersonalizationFromAttempts(input: {
  current: PersonalizationPlan;
  attempts: QuizAttempt[];
}) {
  const weakAreas = Array.from(
    new Set(input.attempts.flatMap((attempt) => (attempt.score / Math.max(attempt.total, 1) < 0.75 ? attempt.weakAreas : [])))
  );

  return {
    ...input.current,
    weakAreas,
    nextActions: weakAreas.length
      ? [
          `Review ${weakAreas[0]} with a simpler explanation.`,
          "Retake the latest mini assessment after one focused revision pass.",
          "Ask the lesson assistant for an analogy and a worked example."
        ]
      : ["Continue to the next lesson.", "Try the mini assessment without notes.", "Generate flashcards for tomorrow's review."]
  };
}
