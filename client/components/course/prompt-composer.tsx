"use client";

import { FormEvent, useState } from "react";
import { Loader2, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

const examples = ["C++ pointers", "Operating System Deadlocks", "Learn React from scratch", "Neural Networks", "System Design for beginners"];

export function PromptComposer({
  onSubmit,
  isPending
}: {
  onSubmit: (topic: string) => void;
  isPending: boolean;
}) {
  const [topic, setTopic] = useState("C++ pointers");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (topic.trim()) {
      onSubmit(topic.trim());
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="Enter any topic"
        aria-label="Topic prompt"
      />
      <div className="flex flex-wrap gap-2">
        {examples.map((example) => (
          <button
            type="button"
            key={example}
            onClick={() => setTopic(example)}
            className="focus-ring rounded-md border border-line bg-surface px-2.5 py-1 text-xs text-muted transition hover:border-teal hover:text-teal"
          >
            {example}
          </button>
        ))}
      </div>
      <Button type="submit" className="w-full" disabled={isPending} title="Generate course">
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
        Forge course
      </Button>
    </form>
  );
}
