"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType } from "react";
import { LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { UserAvatar } from "@/components/auth/user-avatar";
import { useGeminiKey } from "@/components/settings/gemini-key-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export function UserMenu() {
  const { user, logout } = useAuth();
  const { hasKey, maskedKey, openSettings, skipped } = useGeminiKey();
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  if (!user) {
    return null;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-line bg-surface text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
        aria-label="Open profile menu"
      >
        <UserAvatar user={user} priority className="h-full w-full" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-panel p-3 shadow-elevated">
          <div className="flex items-center gap-3 rounded-md border border-line bg-surface p-3">
            <UserAvatar user={user} className="h-11 w-11" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name ?? "CourseForge learner"}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <MenuItem icon={UserRound} label="Profile" />
            <MenuItem icon={ShieldCheck} label="Session" value={user.authProvider === "google" ? "Google OAuth" : "Email and password"} />
            <MenuItem
              icon={Settings}
              label="Settings"
              value={hasKey ? `Gemini ${maskedKey}` : skipped ? "Gemini later" : "Gemini key needed"}
              onClick={() => {
                openSettings();
                setOpen(false);
              }}
            />
          </div>

          <Button type="button" variant="danger" className="mt-3 w-full" onClick={handleLogout} disabled={isLoggingOut}>
            <LogOut className={cn("h-4 w-4", isLoggingOut && "animate-pulse")} />
            Logout
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  value,
  onClick
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-mint text-teal">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-medium text-ink">{label}</p>
        {value ? <p className="text-xs text-muted">{value}</p> : null}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="focus-ring flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition hover:bg-surface"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition hover:bg-surface">{content}</div>
  );
}
