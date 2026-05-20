import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-line bg-mint px-2 py-1 text-xs font-medium text-teal shadow-sm",
        className
      )}
      {...props}
    />
  );
}
