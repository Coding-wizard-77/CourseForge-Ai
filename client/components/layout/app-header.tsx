"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { BrandLogo } from "@/components/brand/brand-logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function AppHeader({
  title = "CourseForge AI",
  subtitle = "Autonomous mini-course builder",
  backHref,
  backLabel = "Dashboard"
}: {
  title?: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-panel/92 shadow-sm backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {backHref ? (
          <Link href={backHref} className="focus-ring inline-flex h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted transition hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" priority className="h-10 w-10 rounded-md shadow-sm" />
            <div>
              <p className="text-base font-semibold text-ink">{title}</p>
              <p className="text-xs text-muted">{subtitle}</p>
            </div>
          </div>
        )}

        <div className="flex min-w-0 items-center gap-3">
          {backHref ? (
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-ink">{title}</p>
              <p className="truncate text-xs text-muted">{subtitle}</p>
            </div>
          ) : null}
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
