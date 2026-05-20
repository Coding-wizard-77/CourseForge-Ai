"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, Chrome, Loader2, LockKeyhole, Mail, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getApiErrorMessage, getGoogleOAuthUrl } from "@/services/api";
import { cn } from "@/utils/cn";

type AuthMode = "login" | "signup";

export function AuthScreen({
  initialMode = "login",
  onBack
}: {
  initialMode?: AuthMode;
  onBack?: () => void;
}) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError === "google_config") {
      setError("Google sign-in is not configured yet. Use email and password for now.");
    } else if (authError?.startsWith("google")) {
      setError("Google sign-in could not be completed.");
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setIsPending(true);

    try {
      if (mode === "signup") {
        await signup({ name, email, password });
      } else {
        await login({ email, password });
      }
    } catch (caught) {
      setError(getApiErrorMessage(caught, "Authentication failed."));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="theme-light min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <div className="max-w-xl">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="focus-ring mb-8 inline-flex items-center gap-2 rounded-md px-1 text-sm font-medium text-muted transition hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to overview
              </button>
            ) : null}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-plum" />
              Private AI learning workspace
            </div>
            <BrandLogo variant="withTitle" priority className="mb-6 h-36 w-36 rounded-lg shadow-soft" />
            <h1 className="max-w-2xl text-5xl font-semibold leading-tight text-ink">
              CourseForge AI
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted">
              Build focused courses, keep progress tied to your account, and return to every module without losing momentum.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-line bg-panel p-5 shadow-soft sm:p-6">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="focus-ring mb-5 inline-flex items-center gap-2 rounded-md px-1 text-sm font-medium text-muted transition hover:text-ink lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Overview
            </button>
          ) : null}
          <div className="mb-6 flex items-center gap-3">
            <BrandLogo variant="mark" priority className="h-11 w-11 rounded-md shadow-sm" />
            <div>
              <p className="text-lg font-semibold text-ink">{mode === "login" ? "Welcome back" : "Create your account"}</p>
              <p className="text-sm text-muted">CourseForge AI</p>
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-md border border-line bg-white p-1">
            {(["login", "signup"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setMode(item);
                  setError("");
                }}
                className={cn(
                  "focus-ring h-9 rounded-md text-sm font-medium capitalize transition",
                  mode === item ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-ink"
                )}
              >
                {item === "login" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted">Name</span>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input value={name} onChange={(event) => setName(event.target.value)} className="pl-9" placeholder="Ada Lovelace" />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Email</span>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input value={email} onChange={(event) => setEmail(event.target.value)} className="pl-9" placeholder="you@example.com" type="email" required />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-muted">Password</span>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <Input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="pl-9"
                  placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                  type="password"
                  minLength={mode === "signup" ? 8 : undefined}
                  required
                />
              </div>
            </label>

            {error ? <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-line" />
            or
            <div className="h-px flex-1 bg-line" />
          </div>

          <Button type="button" variant="secondary" className="w-full" onClick={() => (window.location.href = getGoogleOAuthUrl())}>
            <Chrome className="h-4 w-4" />
            Continue with Google
          </Button>
        </section>
      </div>
    </main>
  );
}
