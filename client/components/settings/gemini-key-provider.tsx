"use client";

import { createContext, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";

type DialogMode = "required" | "settings";

interface GeminiKeyContextValue {
  apiKey: string;
  hasKey: boolean;
  skipped: boolean;
  dialogOpen: boolean;
  isBlocking: boolean;
  maskedKey: string;
  openSettings: () => void;
  closeDialog: () => void;
  saveKey: (key: string) => boolean;
  skipSetup: () => void;
}

const GeminiKeyContext = createContext<GeminiKeyContextValue | null>(null);

function keyStorageKey(userId: string) {
  return `courseforge.gemini.${userId}.key`;
}

function skipStorageKey(userId: string) {
  return `courseforge.gemini.${userId}.skipped`;
}

function validateGeminiKey(value: string) {
  const trimmed = value.trim();
  if (trimmed.length < 24) {
    return "Enter a complete Gemini API key.";
  }
  if (/\s/.test(trimmed)) {
    return "API keys cannot contain spaces.";
  }
  return "";
}

function maskKey(value: string) {
  if (!value) {
    return "";
  }
  if (value.length <= 10) {
    return "Configured";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function GeminiKeyProvider({ children }: { children: React.ReactNode }) {
  const { user, status } = useAuth();
  const [apiKey, setApiKey] = useState("");
  const [skipped, setSkipped] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !user) {
      setApiKey("");
      setSkipped(false);
      setDialogMode(null);
      return;
    }

    const storedKey = window.localStorage.getItem(keyStorageKey(user.id)) ?? "";
    const storedSkipped = window.localStorage.getItem(skipStorageKey(user.id)) === "true";
    setApiKey(storedKey);
    setSkipped(storedSkipped);
    setDialogMode(storedKey || storedSkipped ? null : "required");
  }, [status, user]);

  const saveKey = useCallback(
    (key: string) => {
      if (!user) {
        return false;
      }

      const trimmed = key.trim();
      if (validateGeminiKey(trimmed)) {
        return false;
      }

      window.localStorage.setItem(keyStorageKey(user.id), trimmed);
      window.localStorage.removeItem(skipStorageKey(user.id));
      setApiKey(trimmed);
      setSkipped(false);
      setDialogMode(null);
      return true;
    },
    [user]
  );

  const skipSetup = useCallback(() => {
    if (!user) {
      return;
    }

    window.localStorage.setItem(skipStorageKey(user.id), "true");
    setSkipped(true);
    setDialogMode(null);
  }, [user]);

  const closeDialog = useCallback(() => {
    if (dialogMode === "required" && !apiKey && !skipped) {
      return;
    }
    setDialogMode(null);
  }, [apiKey, dialogMode, skipped]);

  const value = useMemo<GeminiKeyContextValue>(
    () => ({
      apiKey,
      hasKey: Boolean(apiKey),
      skipped,
      dialogOpen: Boolean(dialogMode),
      isBlocking: dialogMode === "required",
      maskedKey: maskKey(apiKey),
      openSettings: () => setDialogMode("settings"),
      closeDialog,
      saveKey,
      skipSetup
    }),
    [apiKey, closeDialog, dialogMode, saveKey, skipSetup, skipped]
  );

  return <GeminiKeyContext.Provider value={value}>{children}</GeminiKeyContext.Provider>;
}

export function useGeminiKey() {
  const value = useContext(GeminiKeyContext);
  if (!value) {
    throw new Error("useGeminiKey must be used inside GeminiKeyProvider");
  }
  return value;
}

export function GeminiKeyGate({ children }: { children: React.ReactNode }) {
  const { dialogOpen } = useGeminiKey();

  return (
    <div className="relative min-h-screen">
      <div className={cn("transition duration-300", dialogOpen && "pointer-events-none select-none blur-sm brightness-90")}>{children}</div>
      <GeminiKeyDialog />
    </div>
  );
}

function GeminiKeyDialog() {
  const { apiKey, closeDialog, dialogOpen, hasKey, isBlocking, saveKey, skipSetup } = useGeminiKey();
  const [value, setValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (dialogOpen) {
      setValue(apiKey);
      setError("");
      setShowKey(false);
    }
  }, [apiKey, dialogOpen]);

  if (!dialogOpen) {
    return null;
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const validation = validateGeminiKey(value);
    if (validation) {
      setError(validation);
      return;
    }

    if (!saveKey(value)) {
      setError("Could not save the API key. Please try again.");
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gemini-key-title"
        className="w-full max-w-md overflow-hidden rounded-lg border border-line bg-panel shadow-elevated"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line/80 p-5">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="gemini-key-title" className="text-base font-semibold text-ink">
                Configure Gemini API Key
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Add your key to unlock AI generation with your own Gemini access.
              </p>
            </div>
          </div>
          {!isBlocking || hasKey ? (
            <button
              type="button"
              onClick={closeDialog}
              className="focus-ring flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-surface hover:text-ink"
              aria-label="Close Gemini settings"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Gemini API Key</span>
            <div className="relative">
              <Input
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError("");
                }}
                type={showKey ? "text" : "password"}
                autoComplete="off"
                spellCheck={false}
                placeholder="Paste your key"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowKey((current) => !current)}
                className="focus-ring absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted transition hover:bg-mint hover:text-teal"
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error ? <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</div> : null}

          <div className="mt-4 rounded-md border border-line bg-surface p-3">
            <div className="flex gap-2 text-sm text-muted">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
              <p className="leading-6">
                The key is saved only for this browser profile and is never shown in the profile menu.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto]">
            <Button type="submit">
              <KeyRound className="h-4 w-4" />
              {hasKey ? "Update key" : "Save key"}
            </Button>
            <Button type="button" variant="secondary" onClick={hasKey ? closeDialog : skipSetup}>
              {hasKey ? "Close" : "Configure later"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
