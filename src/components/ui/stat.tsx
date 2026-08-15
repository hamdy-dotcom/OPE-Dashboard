import type { ReactNode } from "react";

export function StatBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap gap-6 border-b border-hairline px-4 py-3.5">
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone = "neutral",
  suffix,
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "warn" | "stop" | "go";
  suffix?: string;
}) {
  const color =
    tone === "warn"
      ? "text-warn"
      : tone === "stop"
        ? "text-stop"
        : tone === "go"
          ? "text-go"
          : "";
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        {label}
      </div>
      <div className={`tnum mt-0.5 text-xl font-semibold tracking-[-0.02em] ${color}`}>
        {value}
        {suffix && <span className="text-sm text-ink-3">{suffix}</span>}
      </div>
    </div>
  );
}
