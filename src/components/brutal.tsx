import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function BrutalCard({
  className,
  children,
  tone = "paper",
  ...props
}: HTMLAttributes<HTMLDivElement> & { tone?: "paper" | "pink" | "lime" | "orange" | "cyan" | "ink" }) {
  const toneClass = {
    paper: "bg-card text-ink",
    pink: "bg-pink text-ink",
    lime: "bg-lime text-ink",
    orange: "bg-orange text-ink",
    cyan: "bg-cyan text-ink",
    ink: "bg-ink text-paper",
  }[tone];
  return (
    <div className={cn("border-brutal shadow-brutal", toneClass, className)} {...props}>
      {children}
    </div>
  );
}

export function StickerTag({ children, tone = "pink", className }: { children: ReactNode; tone?: "pink" | "lime" | "orange" | "cyan"; className?: string }) {
  const toneClass = { pink: "bg-pink", lime: "bg-lime", orange: "bg-orange", cyan: "bg-cyan" }[tone];
  return (
    <span className={cn("inline-block border-brutal px-2 py-1 text-xs font-display uppercase tracking-wider shadow-brutal-sm", toneClass, className)}>
      {children}
    </span>
  );
}
