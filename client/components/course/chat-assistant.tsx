"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, MessageSquare, Send } from "lucide-react";
import { useGeminiKey } from "@/components/settings/gemini-key-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { askLessonAssistant } from "@/services/api";
import type { Course, VideoResource } from "@/services/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function ChatAssistant({ course, video }: { course: Course; video: VideoResource }) {
  const { apiKey } = useGeminiKey();
  const [question, setQuestion] = useState("Explain this with a simple example");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const mutation = useMutation({
    mutationFn: (text: string) =>
      askLessonAssistant({
        courseId: course.id,
        videoId: video.id,
        question: text
      }, apiKey || undefined),
    onSuccess: (data) => {
      setMessages((current) => [...current, { role: "assistant", content: data.answer }]);
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text) {
      return;
    }
    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");
    mutation.mutate(text);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Bot className="h-4 w-4 text-plum" />
          Lesson Assistant
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="rounded-md border border-line bg-surface p-3 text-sm leading-6 text-muted">
              Ask about a confusing definition, request an analogy, or get a transcript-backed summary.
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={message.role === "user" ? "ml-8 rounded-md bg-primary p-3 text-sm text-primary-foreground" : "mr-8 rounded-md border border-line bg-surface p-3 text-sm leading-6 text-muted"}
              >
                {message.content}
              </div>
            ))
          )}
          {mutation.isPending ? (
            <div className="mr-8 flex items-center gap-2 rounded-md border border-line bg-surface p-3 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking through the transcript
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
          <Input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question" />
          <Button type="submit" size="icon" title="Send question" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <MessageSquare className="h-3.5 w-3.5" />
          Answers use retrieved transcript chunks from the vector index.
        </div>
      </CardContent>
    </Card>
  );
}
