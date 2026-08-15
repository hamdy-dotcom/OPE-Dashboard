"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/lib/i18n/routing";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "ar" ? "en" : "ar";

  return (
    <button
      onClick={() => router.replace(pathname, { locale: next })}
      className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12px] font-semibold tracking-[0.04em] text-ink-2 hover:bg-raise"
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
