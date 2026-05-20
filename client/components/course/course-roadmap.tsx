"use client";

import { BookOpen, CheckCircle2, CirclePlay, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Course, UserProgress } from "@/services/types";
import { cn } from "@/utils/cn";

export function CourseRoadmap({
  course,
  activeModuleIndex,
  activeVideoIndex,
  progress = [],
  onSelectLesson
}: {
  course: Course;
  activeModuleIndex: number;
  activeVideoIndex: number;
  progress?: UserProgress[];
  onSelectLesson: (moduleIndex: number, videoIndex?: number) => void;
}) {
  const completedVideoIds = new Set(progress.filter((item) => item.completed).map((item) => item.videoId));
  const totalVideos = course.modules.reduce((count, module) => count + module.videos.length, 0);
  const completedVideos = course.modules.reduce(
    (count, module) => count + module.videos.filter((video) => completedVideoIds.has(video.id)).length,
    0
  );

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
      <div className="rounded-lg border border-line bg-panel p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">{course.title}</p>
            <p className="mt-1 text-xs text-muted">
              {completedVideos}/{Math.max(totalVideos, 1)} lessons complete
            </p>
          </div>
          <Badge>{course.difficulty}</Badge>
        </div>
        <Progress value={(completedVideos / Math.max(totalVideos, 1)) * 100} className="mt-4" />
      </div>

      <div className="grid gap-2">
        {course.modules.map((module, index) => {
          const isActive = index === activeModuleIndex;
          const moduleCompleted = module.videos.length > 0 && module.videos.every((video) => completedVideoIds.has(video.id));

          return (
            <div
              key={module.id}
              className={cn(
                "rounded-lg border p-2 transition",
                isActive ? "border-teal bg-mint" : "border-line bg-panel hover:border-teal/60"
              )}
            >
              <button type="button" onClick={() => onSelectLesson(index)} className="focus-ring w-full rounded-md p-1 text-left">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                      isActive ? "bg-teal text-white" : "bg-surface text-muted"
                    )}
                  >
                    {moduleCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <PlayCircle className="h-4 w-4" />
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {module.moduleOrder}. {module.title}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{module.summary}</p>
                  </div>
                </div>
              </button>

              {isActive ? (
                <div className="mt-2 grid gap-1.5">
                  {module.videos.map((video, videoIndex) => {
                    const isVideoActive = videoIndex === activeVideoIndex;
                    return (
                      <button
                        key={video.id}
                        type="button"
                        onClick={() => onSelectLesson(index, videoIndex)}
                        className={cn(
                          "focus-ring flex items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition",
                          isVideoActive ? "border-teal bg-surface text-ink shadow-sm" : "border-transparent text-muted hover:border-line hover:bg-surface"
                        )}
                      >
                        {completedVideoIds.has(video.id) ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-teal" />
                        ) : (
                          <CirclePlay className="h-3.5 w-3.5 shrink-0" />
                        )}
                        <span className="line-clamp-1">{video.title}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-line bg-panel p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <CheckCircle2 className="h-4 w-4 text-teal" />
          Roadmap
        </div>
        <div className="space-y-2">
          {course.roadmap.milestones.map((milestone) => (
            <p key={milestone} className="text-xs leading-5 text-muted">
              {milestone}
            </p>
          ))}
        </div>
      </div>
    </aside>
  );
}
