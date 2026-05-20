"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Brain, CalendarClock, CheckCircle2 } from "lucide-react";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { ChatAssistant } from "@/components/course/chat-assistant";
import { CourseRoadmap } from "@/components/course/course-roadmap";
import { LessonViewer } from "@/components/course/lesson-viewer";
import { QuizPanel } from "@/components/course/quiz-panel";
import { AgentTimeline } from "@/components/course/agent-timeline";
import { AppHeader } from "@/components/layout/app-header";
import { GeminiKeyGate } from "@/components/settings/gemini-key-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getCourse, listUserProgress } from "@/services/api";
import { useCourseStore } from "@/store/courseStore";

export default function CoursePage() {
  return (
    <AuthGate>
      <CourseWorkspace />
    </AuthGate>
  );
}

function CourseWorkspace() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { activeModuleIndex, activeVideoIndex, setActiveLesson } = useCourseStore();
  const courseQuery = useQuery({
    queryKey: ["course", params.id],
    queryFn: () => getCourse(params.id),
    enabled: Boolean(params.id)
  });
  const progressQuery = useQuery({
    queryKey: ["progress", user?.id],
    queryFn: () => listUserProgress(user?.id ?? ""),
    enabled: Boolean(user?.id)
  });

  if (courseQuery.isLoading) {
    return <ShellMessage title="Loading course" message="Retrieving modules, notes, quizzes, and vectors." />;
  }

  if (courseQuery.error || !courseQuery.data) {
    return <ShellMessage title="Course not found" message="The API could not return this course." />;
  }

  const course = courseQuery.data;
  const module = course.modules[activeModuleIndex] ?? course.modules[0];
  const video = module?.videos[activeVideoIndex] ?? module?.videos[0];

  if (!module || !video || !user) {
    return <ShellMessage title="No lessons" message="This course does not have lessons yet." />;
  }

  return (
    <GeminiKeyGate>
      <main className="min-h-screen">
        <AppHeader title={course.title} subtitle={course.topic} backHref="/" />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[340px_minmax(0,1fr)] lg:px-8">
          <CourseRoadmap
            course={course}
            activeModuleIndex={activeModuleIndex}
            activeVideoIndex={activeVideoIndex}
            progress={progressQuery.data ?? []}
            onSelectLesson={(moduleIndex, videoIndex) => setActiveLesson(moduleIndex, videoIndex)}
          />

          <section className="min-w-0 space-y-5">
            <LessonViewer module={module} video={video} />

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
              <QuizPanel video={video} userId={user.id} />
              <div className="space-y-5">
                <ChatAssistant course={course} video={video} />
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Brain className="h-4 w-4 text-teal" />
                      Personalized Next
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {course.personalization.nextActions.map((action) => (
                        <div key={action} className="flex gap-3 rounded-md border border-line bg-surface p-3 text-sm text-muted">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <CalendarClock className="h-4 w-4 text-ember" />
                      Revision
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {course.personalization.revisionSchedule.map((item) => (
                        <div key={`${item.topic}-${item.dueInDays}`} className="flex items-center justify-between gap-3 rounded-md border border-line bg-surface p-3">
                          <div>
                            <p className="text-sm font-medium text-ink">{item.topic}</p>
                            <p className="text-xs text-muted">{item.reason}</p>
                          </div>
                          <Badge className="bg-surface">D+{item.dueInDays}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <Brain className="h-4 w-4 text-plum" />
                  Orchestration Trace
                </div>
              </CardHeader>
              <CardContent>
                <AgentTimeline trace={course.agentsTrace} />
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </GeminiKeyGate>
  );
}

function ShellMessage({ title, message }: { title: string; message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="max-w-md">
        <CardContent className="p-6">
          <p className="text-lg font-semibold text-ink">{title}</p>
          <p className="mt-2 text-sm text-muted">{message}</p>
          <Link href="/" className="focus-ring mt-4 inline-flex rounded-md border border-line bg-panel px-4 py-2 text-sm font-medium text-ink">
            Back to dashboard
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
