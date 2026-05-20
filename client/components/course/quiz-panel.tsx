"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { submitQuiz } from "@/services/api";
import type { QuizQuestion, VideoResource } from "@/services/types";
import { cn } from "@/utils/cn";

export function QuizPanel({ video, userId }: { video: VideoResource; userId: string }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const mutation = useMutation({
    mutationFn: () => submitQuiz({ userId, videoId: video.id, answers })
  });
  const gradedById = useMemo(() => {
    const map = new Map<string, { isCorrect: boolean; explanation: string; correctAnswer: string }>();
    mutation.data?.graded.forEach((item) => map.set(item.questionId, item));
    return map;
  }, [mutation.data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <ClipboardCheck className="h-4 w-4 text-teal" />
            Quick Check
          </div>
          {mutation.data ? (
            <div className="rounded-md bg-mint px-3 py-1 text-sm font-semibold text-teal">{mutation.data.score}%</div>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {video.quiz.map((question, index) => (
            <QuestionItem
              key={question.id}
              index={index}
              question={question}
              value={answers[question.id] ?? ""}
              onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))}
              graded={gradedById.get(question.id)}
            />
          ))}
        </div>
        <Button className="mt-5 w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Submit quiz
        </Button>
      </CardContent>
    </Card>
  );
}

function QuestionItem({
  index,
  question,
  value,
  onChange,
  graded
}: {
  index: number;
  question: QuizQuestion;
  value: string;
  onChange: (value: string) => void;
  graded?: { isCorrect: boolean; explanation: string; correctAnswer: string };
}) {
  const hasOptions = question.options.length > 0;

  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-muted">
          {index + 1}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-6 text-ink">{question.question}</p>
          <div className="mt-3">
            {hasOptions ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {question.options.map((option) => (
                  <button
                    type="button"
                    key={option}
                    onClick={() => onChange(option)}
                    className={cn(
                      "focus-ring min-h-10 rounded-md border px-3 py-2 text-left text-sm transition",
                      value === option ? "border-teal bg-mint text-teal" : "border-line bg-panel text-muted hover:border-teal"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : question.type === "fill_blank" ? (
              <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Your answer" />
            ) : (
              <Textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="Write a short response" />
            )}
          </div>
          {graded ? (
            <div
              className={cn(
                "mt-3 rounded-md border p-3 text-sm",
                graded.isCorrect ? "border-teal/30 bg-mint text-teal" : "border-rose-200 bg-rose-50 text-rose-800"
              )}
            >
              <div className="mb-1 flex items-center gap-2 font-medium">
                {graded.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                {graded.isCorrect ? "Correct" : `Answer: ${graded.correctAnswer}`}
              </div>
              <p className="leading-6">{graded.explanation}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
