"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { decodeRange, encodeRange } from "@/lib/filters";

/**
 * The one date range control. Presets cover almost every real use; the
 * two-month calendar is there for the rest.
 *
 * Everything is laid out with logical properties and the calendar is a plain
 * grid, so the whole thing mirrors in RTL without a second code path. The
 * previous/next buttons sit at the inline-start and inline-end edges, which is
 * what makes them read correctly in both directions.
 */

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export type PresetKey =
  | "today"
  | "yesterday"
  | "thisWeek"
  | "last7"
  | "thisMonth"
  | "lastMonth";

/** Ranges are computed on click, never during render — `today` is client-only. */
function presetRange(key: PresetKey): { from: string; to: string } {
  const now = new Date();

  switch (key) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "yesterday": {
      const d = subDays(now, 1);
      return { from: iso(d), to: iso(d) };
    }
    case "thisWeek":
      return {
        from: iso(startOfWeek(now, { weekStartsOn: 6 })),
        to: iso(endOfWeek(now, { weekStartsOn: 6 })),
      };
    case "last7":
      return { from: iso(subDays(now, 6)), to: iso(now) };
    case "thisMonth":
      return { from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
    case "lastMonth": {
      const previous = subMonths(now, 1);
      return { from: iso(startOfMonth(previous)), to: iso(endOfMonth(previous)) };
    }
  }
}

export const PRESETS: PresetKey[] = [
  "today",
  "yesterday",
  "thisWeek",
  "last7",
  "thisMonth",
  "lastMonth",
];

/**
 * Which preset, if any, a stored range corresponds to — so a button can read
 * "Last 7 days" rather than two dates. Depends on today, so callers must only
 * reach for it after hydration.
 */
export function matchPreset(from: string, to: string): PresetKey | null {
  if (!from || !to) return null;
  return (
    PRESETS.find((key) => {
      const range = presetRange(key);
      return range.from === from && range.to === to;
    }) ?? null
  );
}

function Month({
  month,
  from,
  to,
  onPick,
}: {
  month: Date;
  from: string;
  to: string;
  onPick: (day: string) => void;
}) {
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 6 }),
        end: endOfWeek(endOfMonth(month), { weekStartsOn: 6 }),
      }),
    [month],
  );

  const weekdays = days.slice(0, 7);

  return (
    <div className="min-w-[224px]">
      <div className="mb-2 text-center text-[12.5px] font-semibold">
        {format(month, "MMMM yyyy")}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {weekdays.map((d) => (
          <div
            key={`h-${d.toISOString()}`}
            className="pb-1 text-center text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3"
          >
            {format(d, "EEEEE")}
          </div>
        ))}

        {days.map((day) => {
          const value = iso(day);
          const outside = !isSameMonth(day, month);
          const isFrom = from !== "" && value === from;
          const isTo = to !== "" && value === to;
          const inRange = from !== "" && to !== "" && value > from && value < to;
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={value}
              type="button"
              onClick={() => onPick(value)}
              aria-current={isToday ? "date" : undefined}
              className={`tnum h-8 rounded-[7px] text-[12.5px] transition-colors ${
                isFrom || isTo
                  ? "bg-ink font-semibold text-on-ink"
                  : inRange
                    ? "bg-elev text-ink"
                    : outside
                      ? "text-ink-3 hover:bg-raise"
                      : "text-ink-2 hover:bg-raise"
              }`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({
  value,
  onChange,
  label,
}: {
  /** Encoded `from..to`. */
  value: string;
  onChange: (encoded: string) => void;
  label: string;
}) {
  const t = useTranslations("filters");
  const { from, to } = decodeRange(value);

  // Anchored on the selected range when there is one, so reopening lands where
  // the user left off. Computed lazily — never during server render.
  const [anchor, setAnchor] = useState<Date>(() =>
    from ? startOfMonth(new Date(`${from}T00:00:00`)) : startOfMonth(new Date()),
  );

  const pick = (day: string) => {
    // First click sets the start; the second closes the range, and a click
    // before the start restarts from there.
    if (from === "" || to !== "" || day < from) {
      onChange(encodeRange(day, ""));
      return;
    }
    onChange(encodeRange(from, day));
  };

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              const range = presetRange(key);
              setAnchor(startOfMonth(new Date(`${range.from}T00:00:00`)));
              onChange(encodeRange(range.from, range.to));
            }}
            className="rounded-[8px] border border-hairline px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:bg-raise hover:text-ink"
          >
            {t(`preset.${key}`)}
          </button>
        ))}
      </div>

      <div className="border-t border-hairline pt-3">
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor((m) => subMonths(m, 1))}
            aria-label={t("previousMonth")}
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-hairline text-ink-2 transition-colors hover:bg-raise"
          >
            ‹
          </button>
          <span className="flex-1 text-center text-[11px] uppercase tracking-[0.08em] text-ink-3">
            {label}
          </span>
          <button
            type="button"
            onClick={() => setAnchor((m) => addMonths(m, 1))}
            aria-label={t("nextMonth")}
            className="grid h-7 w-7 place-items-center rounded-[7px] border border-hairline text-ink-2 transition-colors hover:bg-raise"
          >
            ›
          </button>
        </div>

        <div className="flex flex-wrap gap-4">
          <Month month={anchor} from={from} to={to} onPick={pick} />
          <Month month={addMonths(anchor, 1)} from={from} to={to} onPick={pick} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <span className="tnum text-[12.5px] text-ink-2">
          {from || t("anyDate")}
          <span className="mx-1.5 text-ink-3">→</span>
          {to || t("anyDate")}
        </span>
        {value !== "" && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="ms-auto text-[12px] text-ink-3 transition-colors hover:text-ink"
          >
            {t("clear")}
          </button>
        )}
      </div>
    </div>
  );
}
