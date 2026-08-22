"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Sidebar } from "./sidebar";
import type { AppRole } from "@/lib/roles";

/**
 * Rebuilt from scratch after four failed attempts (icon button with nested
 * spans, enlarged touch target, negative-margin removal, native <a href>) —
 * all worked in every remote/programmatic test but not on real Android
 * devices. `LocaleSwitch` is the one topbar control confirmed working on
 * those same devices, so this mirrors its structure exactly: a plain
 * `<button>`, plain text, the identical class pattern, no icon, no extra
 * attributes. Only the behavior differs.
 */
export function MobileNav({ role }: { role: AppRole }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12px] font-semibold tracking-[0.04em] text-ink-2 hover:bg-raise xl:hidden"
      >
        {t("menu")}
      </button>

      {open && (
        <>
          <button
            onClick={() => setOpen(false)}
            aria-hidden
            tabIndex={-1}
            className="fixed bottom-0 start-0 end-0 top-[68px] z-40 bg-black/55 xl:hidden"
          />

          <aside
            role="dialog"
            aria-modal="true"
            className="fixed bottom-0 start-0 top-[68px] z-50 flex w-[min(300px,84vw)] flex-col overflow-y-auto border-e border-hairline bg-surface shadow-[0_0_60px_rgb(0_0_0/0.6)] xl:hidden"
          >
            <div className="flex shrink-0 justify-end border-b border-hairline px-3 py-2.5">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-[12px] font-semibold tracking-[0.04em] text-ink-2 hover:bg-raise"
              >
                {t("closeMenu")}
              </button>
            </div>
            <Sidebar role={role} variant="mobile" onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
