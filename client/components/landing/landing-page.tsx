"use client";

import { ArrowRight, BrainCircuit, CheckCircle2, Gauge, Layers3, LockKeyhole, PlayCircle, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";

type AuthIntent = "login" | "signup";

export function LandingPage({ onAuth }: { onAuth: (intent: AuthIntent) => void }) {
  const features = [
    {
      title: "Agent-built roadmaps",
      description: "CourseForge turns a topic into modules, milestones, quizzes, and revision checkpoints.",
      icon: BrainCircuit
    },
    {
      title: "Transcript-grounded lessons",
      description: "Ranked videos are paired with notes, flashcards, and lesson chat grounded in retrieved context.",
      icon: Layers3
    },
    {
      title: "Adaptive learning loop",
      description: "Progress, streaks, and quiz outcomes keep the next action clear when the course grows.",
      icon: Gauge
    }
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#030405] text-white">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-black/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" priority className="h-10 w-10 rounded-md shadow-[0_0_28px_rgba(16,185,129,0.35)]" />
            <div>
              <p className="text-sm font-semibold">CourseForge AI</p>
              <p className="text-xs text-white/55">AI learning studio</p>
            </div>
          </div>

          <div className="hidden items-center gap-6 text-sm text-white/65 md:flex">
            <a href="#features" className="transition hover:text-emerald-300">
              Features
            </a>
            <a href="#workflow" className="transition hover:text-emerald-300">
              Workflow
            </a>
            <a href="#security" className="transition hover:text-emerald-300">
              Security
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAuth("signup")}
              className="focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-black shadow-[0_0_28px_rgba(52,211,153,0.35)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </nav>

      <section className="relative min-h-[88vh] px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(239,68,68,0.2),transparent_32%,rgba(16,185,129,0.18)_68%,transparent)]" />
        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:64px_64px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#030405] to-transparent" />

        <div className="absolute right-0 top-24 hidden h-[34rem] w-[56rem] max-w-[62vw] overflow-hidden rounded-l-lg border border-white/10 bg-white/[0.06] shadow-[0_28px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl lg:block">
          <div className="flex h-11 items-center gap-2 border-b border-white/10 bg-black/45 px-4">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
            <span className="h-3 w-3 rounded-full bg-white/30" />
          </div>
          <div className="grid h-[calc(100%-2.75rem)] grid-cols-[240px_minmax(0,1fr)] gap-4 p-4">
            <div className="space-y-3 border-r border-white/10 pr-4">
              {["Planner Agent", "Research Agent", "Quiz Agent", "RAG Agent"].map((item, index) => (
                <div key={item} className="rounded-md border border-white/10 bg-black/35 p-3">
                  <div className="mb-2 flex items-center gap-2 text-xs font-medium text-white/75">
                    <CheckCircle2 className={index < 3 ? "h-3.5 w-3.5 text-emerald-300" : "h-3.5 w-3.5 text-red-300"} />
                    {item}
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-emerald-300" style={{ width: `${86 - index * 12}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-4">
              <div className="rounded-md border border-emerald-300/25 bg-emerald-300/[0.08] p-4">
                <p className="text-xs uppercase text-emerald-200">Generated course</p>
                <p className="mt-3 max-w-lg text-2xl font-semibold">System Design for Beginners</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">
                  Five focused modules with ranked resources, transcript notes, adaptive checks, and a lesson assistant.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {["Core Mechanics", "Guided Practice", "Assessment", "Next Roadmap"].map((item) => (
                  <div key={item} className="rounded-md border border-white/10 bg-black/35 p-4">
                    <PlayCircle className="mb-3 h-5 w-5 text-red-300" />
                    <p className="text-sm font-medium">{item}</p>
                    <p className="mt-2 text-xs leading-5 text-white/50">Lesson notes, flashcards, and quick checks.</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mx-auto flex min-h-[calc(88vh-7rem)] max-w-7xl items-center">
          <div className="max-w-3xl py-16">
            <BrandLogo variant="withTitle" priority className="mb-8 h-32 w-32 rounded-lg shadow-[0_0_55px_rgba(16,185,129,0.18)] sm:h-40 sm:w-40" />
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-200 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Autonomous courses from any topic
            </div>
            <h1 className="max-w-4xl text-5xl font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              CourseForge AI
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/68 sm:text-lg">
              A premium AI-powered learning workspace that researches, structures, explains, quizzes, and adapts your mini-course in one focused flow.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => onAuth("signup")}
                className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-semibold text-black shadow-[0_0_34px_rgba(52,211,153,0.36)] transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
              <a
                href="#features"
                className="focus-ring inline-flex h-11 items-center justify-center rounded-md border border-white/15 bg-white/10 px-5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:border-red-300/45 hover:bg-red-500/10"
              >
                Explore platform
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="relative border-y border-white/10 bg-[#07100d] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase text-red-300">AI-powered flow</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">From raw curiosity to a structured course.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-lg border border-white/10 bg-white/[0.055] p-5 backdrop-blur transition hover:-translate-y-1 hover:border-emerald-300/35 hover:bg-white/[0.08]">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-gradient-to-br from-red-500/90 to-emerald-300 text-black">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/62">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase text-emerald-300">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">A focused studio for repeated learning.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/62">
              Generate a course, open a module, watch the ranked resource, study generated notes, then quiz yourself without leaving the workspace.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Prompt", "Plan", "Study", "Review"].map((step, index) => (
              <div key={step} className="rounded-lg border border-white/10 bg-black/45 p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-red-500/15 text-red-200">{index + 1}</div>
                <p className="font-semibold">{step}</p>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  {index === 0
                    ? "Start with any topic, from fundamentals to interview prep."
                    : index === 1
                      ? "Agents create the roadmap and resource strategy."
                      : index === 2
                        ? "Notes, flashcards, and chat keep each lesson grounded."
                        : "Progress and quizzes shape what to do next."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="security" className="px-4 pb-16 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-lg border border-emerald-300/20 bg-gradient-to-r from-emerald-300/10 via-white/[0.04] to-red-500/10 p-6 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-emerald-300 text-black">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Private by default</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-white/62">
                Accounts keep progress tied to your session, and Gemini key setup is handled after authentication before dashboard use.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAuth("signup")}
            className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:-translate-y-0.5 hover:bg-emerald-100"
          >
            Start learning
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-sm text-white/48 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>CourseForge AI</p>
          <p>Agentic course generation for focused self-paced learning.</p>
        </div>
      </footer>
    </main>
  );
}
