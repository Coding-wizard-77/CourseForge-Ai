"use client";

import { ExternalLink, PlayCircle, Sparkles, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CourseModule, VideoResource } from "@/services/types";

export function LessonViewer({ module, video }: { module: CourseModule; video: VideoResource }) {
  const canEmbed = !video.youtubeVideoId.startsWith("demo-");

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden lg:sticky lg:top-24 lg:z-20">
        <div className="aspect-video bg-black">
          {canEmbed ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              className="flex h-full items-center justify-center bg-cover bg-center p-6 text-center text-white"
              style={{ backgroundImage: `linear-gradient(rgba(23,23,23,.62), rgba(23,23,23,.62)), url(${video.thumbnail})` }}
            >
              <div className="max-w-md">
                <PlayCircle className="mx-auto mb-3 h-10 w-10" />
                <p className="text-lg font-semibold">{video.title}</p>
                <p className="mt-2 text-sm text-white/80">Open the ranked learning resource in a new tab.</p>
                <a
                  href={video.url}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-panel px-4 text-sm font-medium text-ink transition hover:bg-mint/80"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open resource
                </a>
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted">{module.title}</p>
                <h1 className="mt-1 text-xl font-semibold text-ink">{video.title}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{Math.round(video.qualityScore * 100)} quality</Badge>
                <Badge className="bg-surface text-ember">{video.duration}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink">
              <StickyNote className="h-4 w-4 text-teal" />
              Notes
            </div>
            <p className="text-sm leading-6 text-muted">{video.summary}</p>
            <div className="mt-4 grid gap-2">
              {video.keyTakeaways.map((takeaway) => (
                <div key={takeaway} className="rounded-md border border-line bg-surface p-3 text-sm leading-6 text-ink transition hover:border-teal/50">
                  {takeaway}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles className="h-4 w-4 text-plum" />
              Flashcards
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {video.flashcards.map((card) => (
                <div key={card.front} className="rounded-md border border-line bg-surface p-3 transition hover:border-plum/40">
                  <p className="text-sm font-medium text-ink">{card.front}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{card.back}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
