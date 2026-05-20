"use client";

import { AuthScreen } from "@/components/auth/auth-screen";
import { useAuth } from "@/components/auth/auth-provider";

export function AuthGate({
  children,
  anonymousFallback,
  loadingFallback
}: {
  children: React.ReactNode;
  anonymousFallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
}) {
  const { status } = useAuth();

  if (status === "loading") {
    return <>{loadingFallback ?? anonymousFallback ?? null}</>;
  }

  if (status === "anonymous") {
    return anonymousFallback ?? <AuthScreen />;
  }

  return <>{children}</>;
}
