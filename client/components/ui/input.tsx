import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "focus-ring h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink shadow-sm transition placeholder:text-muted hover:border-teal/40",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "focus-ring min-h-24 w-full resize-none rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink shadow-sm transition placeholder:text-muted hover:border-teal/40",
        className
      )}
      {...props}
    />
  );
}
