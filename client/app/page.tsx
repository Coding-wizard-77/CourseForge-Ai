"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, Layers3, Loader2, PlayCircle, Sparkles } from "lucide-react";
import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthGate } from "@/components/auth/auth-gate";
import { useAuth } from "@/components/auth/auth-provider";
import { AgentTimeline } from "@/components/course/agent-timeline";
import { DashboardStats } from "@/components/course/dashboard-stats";
import { PromptComposer } from "@/components/course/prompt-composer";
import { LandingPage } from "@/components/landing/landing-page";
import { AppHeader } from "@/components/layout/app-header";
import { GeminiKeyGate } from "@/components/settings/gemini-key-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { listUserCourses, listUserProgress } from "@/services/api";
import type { Course } from "@/services/types";
import { useCourseGeneration } from "@/hooks/useCourseGeneration";

type AuthMode = "login" | "signup";

export default function HomePage() {
  const { status } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [isCompletingOAuth, setIsCompletingOAuth] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("auth_error")) {
      setAuthMode("login");
    }
    if (params.get("auth") === "google") {
      setIsCompletingOAuth(true);
    }
  }, []);

  useEffect(() => {
    if (!isCompletingOAuth || status === "loading") {
      return;
    }

    if (status === "authenticated") {
      window.history.replaceState(null, "", window.location.pathname || "/");
      setIsCompletingOAuth(false);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("auth");
    url.searchParams.set("auth_error", "google_session");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setAuthMode("login");
    setIsCompletingOAuth(false);
  }, [isCompletingOAuth, status]);

  const authCompletionExperience = <OAuthReturnScreen />;
  const publicExperience = authMode ? (
    <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} />
  ) : isCompletingOAuth ? (
    authCompletionExperience
  ) : (
    <LandingPage onAuth={(intent) => setAuthMode(intent)} />
  );

  return (
    <AuthGate
      loadingFallback={publicExperience}
      anonymousFallback={publicExperience}
    >
      <DashboardPage />
    </AuthGate>
  );
}

function OAuthReturnScreen() {
  return (
    <main className="theme-light grid min-h-screen place-items-center bg-background px-4">
      <div className="flex items-center gap-3 rounded-lg border border-line bg-panel px-5 py-4 text-sm font-medium text-ink shadow-soft">
        <Loader2 className="h-4 w-4 animate-spin text-teal" />
        Signing you in
      </div>
    </main>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const coursesQuery = useQuery({
    queryKey: ["courses", userId],
    queryFn: () => listUserCourses(userId),
    enabled: Boolean(userId)
  });
  const progressQuery = useQuery({
    queryKey: ["progress", userId],
    queryFn: () => listUserProgress(userId),
    enabled: Boolean(userId)
  });
  const generation = useCourseGeneration(userId);
  const courses = mergeCourses(generation.data ? [generation.data, ...(coursesQuery.data ?? [])] : coursesQuery.data ?? []);
  const latestCourse = generation.data ?? courses[0];

  return (
    <GeminiKeyGate>
      <main className="min-h-screen">
      <AppHeader />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
        <section className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles className="h-4 w-4 text-plum" />
                Topic Prompt
              </div>
            </CardHeader>
            <CardContent>
              <PromptComposer onSubmit={(topic) => generation.mutate(topic)} isPending={generation.isPending} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Brain className="h-4 w-4 text-teal" />
                AI Agents
              </div>
            </CardHeader>
            <CardContent>
              <AgentTimeline trace={generation.data?.agentsTrace} pending={generation.isPending} />
            </CardContent>
          </Card>
        </section>

        <section className="min-w-0 space-y-5">
          <DashboardStats coursesCount={courses.length} progress={progressQuery.data ?? []} />

          {generation.error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              {generation.error instanceof Error ? generation.error.message : "Course generation failed."}
            </div>
          ) : null}

          {generation.isPending ? (
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-[1fr_260px]">
                  <div>
                    <p className="text-sm font-semibold text-ink">Building your course</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      Planning modules, ranking learning videos, generating checks, and indexing lesson context.
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                      <PlayCircle className="h-4 w-4 text-teal" />
                      Pipeline
                    </div>
                    <div className="space-y-2 text-xs text-muted">
                      <p>Planner / Research / Embeddings</p>
                      <p>Ranking / Notes / Quiz / Roadmap</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : latestCourse ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <Badge>{latestCourse.difficulty}</Badge>
                      <h1 className="mt-3 text-2xl font-semibold text-ink">{latestCourse.title}</h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{latestCourse.roadmap.modules[0]?.focus}</p>
                    </div>
                    <Link
                      href={`/courses/${latestCourse.id}`}
                      className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-soft"
                    >
                      <BookOpen className="h-4 w-4" />
                      Open course
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {latestCourse.modules.map((module) => (
                      <Link
                        key={module.id}
                        href={`/courses/${latestCourse.id}`}
                        className="focus-ring rounded-lg border border-line bg-surface p-4 transition hover:-translate-y-0.5 hover:border-teal hover:shadow-soft"
                      >
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-ink">
                            {module.moduleOrder}. {module.title}
                          </p>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
                        </div>
                        <p className="line-clamp-2 text-xs leading-5 text-muted">{module.summary}</p>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6 md:grid-cols-[1fr_280px]">
                  <div>
                    <h1 className="text-2xl font-semibold text-ink">Generate a personalized course from any topic.</h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                      Start with a focused prompt and your private course workspace will fill with modules, notes, quizzes, and an assistant.
                    </p>
                  </div>
                  <div className="rounded-lg border border-line bg-surface p-4">
                    <p className="text-sm font-medium text-ink">Good prompts</p>
                    <div className="mt-3 grid gap-2 text-xs text-muted">
                      <p>C++ pointers</p>
                      <p>Operating System Deadlocks</p>
                      <p>System Design for beginners</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                <BookOpen className="h-4 w-4 text-ember" />
                Recent Courses
              </div>
            </CardHeader>
            <CardContent>
              {courses.length ? (
                <div className="-mx-4 overflow-x-auto px-4 pb-2 scroll-smooth">
                  <div className="flex min-w-full gap-3">
                    {courses.map((course) => (
                      <RecentCourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">Generated courses will appear here.</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      </main>
    </GeminiKeyGate>
  );
}

function RecentCourseCard({ course }: { course: Course }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="focus-ring group flex w-[280px] shrink-0 flex-col justify-between rounded-lg border border-line bg-surface p-4 text-sm shadow-sm transition hover:-translate-y-0.5 hover:border-teal hover:shadow-soft sm:w-[320px]"
    >
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Badge className="bg-mint">{course.difficulty}</Badge>
          <Layers3 className="h-4 w-4 text-muted transition group-hover:text-teal" />
        </div>
        <p className="line-clamp-2 font-semibold leading-6 text-ink">{course.title}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{course.topic}</p>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
        <span>{course.modules.length} modules</span>
        <span>{course.estimatedHours}h</span>
      </div>
    </Link>
  );
}

function mergeCourses(courses: Course[]) {
  const seen = new Set<string>();
  return courses.filter((course) => {
    if (seen.has(course.id)) {
      return false;
    }
    seen.add(course.id);
    return true;
  });
}
