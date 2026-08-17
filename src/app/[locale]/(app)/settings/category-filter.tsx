"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import type { LookupCategoryRow } from "./queries";

/** Narrows the lookup table to one category. Empty shows every category. */
export function CategoryFilter({
  categories,
  category,
}: {
  categories: LookupCategoryRow[];
  category: string;
}) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (next: string) => {
    const query: Record<string, string> = { entity: "lookups" };
    if (next) query.category = next;
    start(() => router.replace({ pathname: "/settings", query }));
  };

  return (
    <div
      className={`border-b border-hairline px-4 py-3 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <select
        value={category}
        onChange={(e) => go(e.target.value)}
        aria-label={t("field.category")}
        className="w-full rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[13.5px] text-ink sm:w-auto"
      >
        <option value="">{t("allCategories")}</option>
        {categories.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}
