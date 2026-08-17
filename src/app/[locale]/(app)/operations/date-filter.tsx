"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";

/** Operating-date filter. Lives in the panel header beside the New button. */
export function DateFilter({
  date,
  today,
  filter,
}: {
  date: string;
  today: string;
  /** Preserved so changing the date keeps the chosen chip. */
  filter: string;
}) {
  const t = useTranslations("operations");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (nextDate: string) => {
    const query: Record<string, string> = {};
    if (nextDate) query.date = nextDate;
    if (filter) query.filter = filter;
    start(() => router.replace({ pathname: "/operations", query }));
  };

  return (
    <div className={`flex items-center gap-2.5 ${pending ? "opacity-60" : ""}`}>
      <input
        type="date"
        value={date}
        aria-label={t("field.date")}
        onChange={(e) => go(e.target.value)}
        className="tnum rounded-[8px] border border-hairline bg-canvas px-2.5 py-1.5 text-[12.5px] text-ink"
      />
      <button
        type="button"
        onClick={() => go(today)}
        className="text-[12.5px] text-ink-2 hover:text-ink"
      >
        {tCommon("today")}
      </button>
      {date && (
        <button
          type="button"
          onClick={() => go("")}
          className="text-[12.5px] text-ink-3 hover:text-ink"
        >
          {t("clearFilters")}
        </button>
      )}
    </div>
  );
}
