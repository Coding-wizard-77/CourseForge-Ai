"use client";

import { useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/services/types";
import {
  isAvatarFailed,
  isAvatarLoaded,
  markAvatarFailed,
  markAvatarLoaded,
  normalizeAvatarUrl,
  preloadAvatar
} from "@/utils/avatar-cache";
import { cn } from "@/utils/cn";

export function UserAvatar({
  user,
  className,
  priority = false
}: {
  user: AuthUser;
  className?: string;
  priority?: boolean;
}) {
  const src = useMemo(() => normalizeAvatarUrl(user.avatarUrl), [user.avatarUrl]);
  const [loaded, setLoaded] = useState(() => Boolean(src && isAvatarLoaded(src)));
  const [failed, setFailed] = useState(() => Boolean(src && isAvatarFailed(src)));
  const initials = getInitials(user.name ?? user.email);

  useEffect(() => {
    if (!src) {
      setLoaded(false);
      setFailed(false);
      return;
    }

    setLoaded(isAvatarLoaded(src));
    setFailed(isAvatarFailed(src));
    preloadAvatar(src);
  }, [src]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-semibold text-primary-foreground",
        className
      )}
      aria-hidden="true"
    >
      <span className="select-none">{initials || "CF"}</span>
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt=""
          className={cn("absolute inset-0 h-full w-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          referrerPolicy="no-referrer"
          onLoad={() => {
            markAvatarLoaded(src);
            setLoaded(true);
            setFailed(false);
          }}
          onError={() => {
            markAvatarFailed(src);
            setLoaded(false);
            setFailed(true);
          }}
        />
      ) : null}
    </span>
  );
}

function getInitials(value: string) {
  return value
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
