import type { ReactNode } from "react";

type MicroTone = "neutral" | "go" | "warn" | "stop";

const TEXT: Record<MicroTone, string> = {
  neutral: "text-ink-3",
  go: "text-go-text",
  warn: "text-warn-text",
  stop: "text-stop-text",
};

const BAR: Record<MicroTone, string> = {
  neutral: "bg-ink-3",
  go: "bg-go",
  warn: "bg-warn",
  stop: "bg-stop",
};

/** Uppercase meta label with an optional coloured bar prefix. */
export function Micro({
  tone = "neutral",
  bar = true,
  children,
}: {
  tone?: MicroTone;
  bar?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] whitespace-nowrap ${TEXT[tone]}`}
    >
      {bar && (
        <span className={`h-[11px] w-[2.5px] rounded-sm ${BAR[tone]}`} aria-hidden />
      )}
      {children}
    </span>
  );
}

export function Swatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-[3px]"
      style={{ background: color }}
      aria-hidden
    />
  );
}
