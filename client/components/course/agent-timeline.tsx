import { CheckCircle2, CircleDashed, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentTrace } from "@/services/types";

const defaultAgents = [
  "Course Planner Agent",
  "Content Research Agent",
  "Embedding/RAG Agent",
  "Quiz Generator Agent",
  "Summary Agent",
  "Personalization Agent"
];

export function AgentTimeline({ trace = [], pending = false }: { trace?: AgentTrace[]; pending?: boolean }) {
  const visible = trace.length
    ? trace
    : defaultAgents.map((agent) => ({
        agent,
        status: pending ? ("running" as const) : ("queued" as const),
        message: pending ? "Working" : "Ready"
      }));

  return (
    <div className="grid gap-2">
      {visible.map((item) => (
        <div key={`${item.agent}-${item.message}`} className="flex items-start gap-3 rounded-md border border-line bg-surface p-3">
          {item.status === "complete" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
          ) : item.status === "fallback" ? (
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-ember" />
          ) : (
            <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-ink">{item.agent}</p>
              <Badge className="bg-surface text-[11px] capitalize">{item.status}</Badge>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted">{item.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
