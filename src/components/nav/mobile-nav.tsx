"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Sidebar } from "./sidebar";
import type { AppRole } from "@/lib/roles";

/**
 * Below `xl` the sidebar in the shell is hidden and there is no other way to
 * move between modules, so this is the mobile replacement: a hamburger
 * trigger in the topbar that opens the same `Sidebar` content in a sheet
 * sliding in from the start edge, mirroring the record `Drawer`'s geometry
 * (full height under the topbar, same z-40/z-50 scrim-and-panel convention).
 *
 * Root cause of the "taps do nothing" bug (five prior attempts, all passing
 * every programmatic test but failing on real Android hardware): Chrome for
 * Android's overscroll history navigation claims edge-adjacent touches as a
 * back-gesture candidate before they ever reach the DOM, entirely outside
 * React's event system — which is why every synthetic/remote test here
 * always looked fine. `overscroll-x-none` on the header (see Topbar) and on
 * this button opts that region out. OEM Chromium forks that don't implement
 * Chrome's edge-navigation gesture never showed the bug, which is what
 * pointed at this.
 */
export function MobileNav({ role }: { role: AppRole }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openMenu")}
        aria-expanded={open}
        className="grid h-11 w-11 shrink-0 touch-pan-y overscroll-x-none place-items-center rounded-[8px] border border-hairline text-ink-2 transition-colors hover:bg-raise hover:text-ink xl:hidden"
      >
        <span aria-hidden className="grid gap-[3px]">
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
        </span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed bottom-0 start-0 end-0 top-[68px] z-40 bg-black/55 xl:hidden"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("openMenu")}
            className="fixed bottom-0 start-0 top-[68px] z-50 flex w-[min(300px,84vw)] flex-col overflow-y-auto border-e border-hairline bg-surface shadow-[0_0_60px_rgb(0_0_0/0.6)] xl:hidden"
          >
            <div className="flex shrink-0 justify-end border-b border-hairline px-3 py-2.5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("closeMenu")}
                className="grid h-11 w-11 place-items-center rounded-[8px] border border-hairline text-[15px] text-ink-2 transition-colors hover:bg-raise hover:text-ink"
              >
                ×
              </button>
            </div>
            <Sidebar role={role} variant="mobile" onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
