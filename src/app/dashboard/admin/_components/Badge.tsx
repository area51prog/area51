import React from "react";

export type BadgeTone = "brand" | "amber" | "up" | "down" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  brand: "bg-brand-light text-brand",
  amber: "bg-amber-400/15 text-amber-500",
  up: "bg-up/10 text-up",
  down: "bg-down/10 text-down",
  neutral: "bg-background text-foreground/50",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
