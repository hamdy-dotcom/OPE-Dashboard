"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import type { ShiftOption } from "./queries";

/**
 * Date and shift filters. Selection lives in the URL so the list and the
 * detail panel beside it stay Server Components.
 */
export function OperationsFilters({
  shifts,
  date,
  shift,
  today,
}: {
  shifts: ShiftOption[];
  date: string;
  shift: string;
  today: string;
}) {
  const t = useTranslations("operations");
  const tShift = useTranslations("shift");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  /** Selection is dropped on every filter change — it may no longer be listed. */
  const apply = (next: { date?: string; shift?: string }) => {
    const query: Record<string, string> = {};
    const nextDate = next.date ?? date;
    const nextShift = next.shift ?? shift;
    if (nextDate) query.date = nextDate;
    if (nextShift) query.shift = nextShift;

    start(() => router.replace({ pathname: "/operations", query }));
  };

  const chip = (active: boolean) =>
    `rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
      active
        ? "bg-elev text-ink shadow-[0_0_0_1px_rgb(255_255_255/0.08)]"
        : "text-ink-2 hover:bg-raise"
    }`;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2.5 border-b border-hairline px-4 py-3 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <label className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
          {t("field.date")}
        </span>
        <input
          type="date"
          value={date}
          onChange={(e) => apply({ date: e.target.value })}
          className="tnum rounded-[8px] border border-hairline bg-canvas px-2.5 py-1.5 text-[13px] text-ink"
        />
      </label>

      <div className="flex items-center gap-1 rounded-full border border-hairline bg-canvas p-[3px]">
        <button type="button" onClick={() => apply({ shift: "" })} className={chip(!shift)}>
          {t("allShifts")}
        </button>
        {shifts.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => apply({ shift: s.code })}
            className={chip(shift === s.code)}
          >
            {tShift.has(s.code) ? tShift(s.code) : s.labelEn}
          </button>
        ))}
      </div>

      <div className="ms-auto flex items-center gap-3 text-[12.5px]">
        <button
          type="button"
          onClick={() => apply({ date: today })}
          className="text-ink-2 hover:text-ink"
        >
          {tCommon("today")}
        </button>
        {(date || shift) && (
          <button
            type="button"
            onClick={() => start(() => router.replace({ pathname: "/operations" }))}
            className="text-ink-3 hover:text-ink"
          >
            {t("clearFilters")}
          </button>
        )}
      </div>
    </div>
  );
}
