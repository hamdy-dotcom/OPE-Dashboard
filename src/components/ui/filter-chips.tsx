"use client";

import { useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";

export type Chip = {
  /** Empty string is the "all" chip. */
  value: string;
  label: string;
  count: number;
  tone?: "neutral" | "go" | "warn" | "stop";
};

const COUNT_TONE = {
  neutral: "text-ink-3",
  go: "text-go-text",
  warn: "text-warn-text",
  stop: "text-stop-text",
} as const;

/**
 * Filter chips above a table, each carrying its live count. Selecting one
 * rewrites the URL and drops `id`/`mode` — the open record may not survive the
 * new filter.
 */
export function FilterChips({
  chips,
  active,
  param,
  pathname,
  extraQuery = {},
}: {
  chips: Chip[];
  active: string;
  param: string;
  pathname: string;
  /** Filters that should outlive a chip change, e.g. the operating date. */
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (value: string) => {
    const query = { ...extraQuery };
    if (value) query[param] = value;
    start(() => router.replace({ pathname, query }));
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 border-b border-hairline px-4 py-2.5 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      {chips.map((chip) => {
        const isActive = active === chip.value;
        return (
          <button
            key={chip.value || "all"}
            type="button"
            onClick={() => go(chip.value)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-medium whitespace-nowrap transition-colors ${
              isActive
                ? "bg-elev text-ink shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
                : "text-ink-2 hover:bg-raise"
            }`}
          >
            <span>{chip.label}</span>
            <span className={`tnum text-[11px] ${COUNT_TONE[chip.tone ?? "neutral"]}`}>
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
