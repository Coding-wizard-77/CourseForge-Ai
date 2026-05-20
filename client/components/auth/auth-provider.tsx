"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser } from "@/services/types";
import { getCurrentUser, login as loginRequest, logout as logoutRequest, signup as signupRequest } from "@/services/api";
import { preloadAvatar } from "@/utils/avatar-cache";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  login: (input: { email: string; password: string }) => Promise<AuthUser>;
  signup: (input: { name?: string; email: string; password: string }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_USER_STORAGE_KEY = "courseforge.auth.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    const cachedUser = readCachedUser();

    if (cachedUser) {
      preloadAvatar(cachedUser.avatarUrl);
      setUser(cachedUser);
      setStatus("authenticated");
    }

    getCurrentUser()
      .then((currentUser) => {
        if (mounted) {
          cacheUser(currentUser);
          preloadAvatar(currentUser.avatarUrl);
          setUser(currentUser);
          setStatus("authenticated");
        }
      })
      .catch(() => {
        if (mounted) {
          clearCachedUser();
          setUser(null);
          setStatus("anonymous");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      setUser: (nextUser) => {
        if (nextUser) {
          cacheUser(nextUser);
          preloadAvatar(nextUser.avatarUrl);
        } else {
          clearCachedUser();
        }
        setUser(nextUser);
        setStatus(nextUser ? "authenticated" : "anonymous");
      },
      login: async (input) => {
        const nextUser = await loginRequest(input);
        cacheUser(nextUser);
        preloadAvatar(nextUser.avatarUrl);
        setUser(nextUser);
        setStatus("authenticated");
        return nextUser;
      },
      signup: async (input) => {
        const nextUser = await signupRequest(input);
        cacheUser(nextUser);
        preloadAvatar(nextUser.avatarUrl);
        setUser(nextUser);
        setStatus("authenticated");
        return nextUser;
      },
      logout: async () => {
        await logoutRequest();
        clearCachedUser();
        setUser(null);
        setStatus("anonymous");
      }
    }),
    [status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}

function readCachedUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (!parsed.id || !parsed.email || !parsed.createdAt || !parsed.authProvider) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name ?? null,
      avatarUrl: parsed.avatarUrl ?? null,
      authProvider: parsed.authProvider,
      createdAt: parsed.createdAt
    } as AuthUser;
  } catch {
    clearCachedUser();
    return null;
  }
}

function cacheUser(user: AuthUser) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Storage may be disabled; auth still works from the session cookie.
  }
}

function clearCachedUser() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}
