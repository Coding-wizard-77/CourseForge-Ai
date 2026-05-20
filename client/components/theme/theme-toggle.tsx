"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "focus-ring inline-flex h-9 w-[4.25rem] items-center rounded-full border border-line bg-surface p-1 shadow-sm transition hover:border-teal/60",
        className
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200",
          isDark ? "translate-x-7" : "translate-x-0"
        )}
      >
        {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}
