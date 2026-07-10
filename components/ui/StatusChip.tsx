import type { ReactNode } from "react";

type StatusChipProps = {
  children: ReactNode;
  /** moss: 긍정/진행, paper: 중립, sun: 주의/마감 임박, ink: 강조 */
  tone?: "moss" | "paper" | "sun" | "ink";
};

const TONE_CLASSES: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  moss: "bg-moss/10 text-moss",
  paper: "bg-paper text-ink/60",
  sun: "bg-sun/15 text-ink/70",
  ink: "bg-ink text-white"
};

export function StatusChip({ children, tone = "paper" }: StatusChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
