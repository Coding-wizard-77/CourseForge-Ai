import Image from "next/image";
import { cn } from "@/utils/cn";

const LOGO_WITH_TITLE = "/brand/courseforge-ai-logo-with-title.png";
const LOGO_WITHOUT_TITLE = "/brand/courseforge-ai-logo-without-title.png";

export function BrandLogo({
  variant = "mark",
  className,
  priority = false
}: {
  variant?: "mark" | "withTitle";
  className?: string;
  priority?: boolean;
}) {
  const withTitle = variant === "withTitle";

  return (
    <Image
      src={withTitle ? LOGO_WITH_TITLE : LOGO_WITHOUT_TITLE}
      alt={withTitle ? "CourseForge AI" : "CourseForge AI logo"}
      width={withTitle ? 1254 : 565}
      height={withTitle ? 1254 : 588}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
