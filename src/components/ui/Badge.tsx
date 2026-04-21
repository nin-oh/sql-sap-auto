import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "success" | "danger" | "warn" | "accent";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-slate-300 border-white/10",
    success: "bg-success/10 text-success border-success/20",
    danger: "bg-danger/10 text-danger border-danger/30",
    warn: "bg-warn/10 text-warn border-warn/30",
    accent: "bg-accent/15 text-accent-glow border-accent/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
