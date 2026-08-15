import type { ReactNode } from "react";

export type Tone = "go" | "warn" | "stop" | "idle" | "ghost";

const TONE: Record<Tone, string> = {
  go: "bg-go text-on-accent",
  warn: "bg-warn text-[#2A1E02]",
  stop: "bg-stop text-[#2A0B09]",
  idle: "bg-idle text-ink",
  ghost: "bg-idle text-ink-2",
};

/** Small uppercase status pill. The only saturated element on screen. */
export function Pill({
  tone = "idle",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.07em] whitespace-nowrap ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
