"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/lib/i18n/routing";
import { Sidebar } from "./sidebar";
import type { AppRole } from "@/lib/roles";

/**
 * Below `xl` the sidebar in the shell is hidden and there is no other way to
 * move between modules, so this is the mobile replacement: a trigger in the
 * topbar that opens the same `Sidebar` content in a sheet sliding in from the
 * start edge, mirroring the record `Drawer`'s geometry (full height under the
 * topbar, same z-40/z-50 scrim-and-panel convention).
 *
 * Driven entirely by a `?nav=1` URL param, the same way the record drawer is
 * driven by `?id=`/`?mode=` — the open/close controls are real `<Link>`s, not
 * a custom onClick + useState toggle. A tap on a real anchor is native
 * browser navigation, not dependent on a JS click handler ever attaching, so
 * this sidesteps whatever was swallowing taps on the previous button-based
 * version on real devices.
 */
export function MobileNav({ role }: { role: AppRole }) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const open = searchParams.get("nav") === "1";

  const query: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    if (key !== "nav") query[key] = value;
  });

  const openHref = { pathname, query: { ...query, nav: "1" } };
  const closeHref = { pathname, query };

  return (
    <>
      <Link
        href={openHref}
        aria-label={t("openMenu")}
        aria-expanded={open}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-hairline text-ink-2 transition-colors hover:bg-raise hover:text-ink xl:hidden"
      >
        <span aria-hidden className="grid gap-[3px]">
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
          <span className="block h-[1.5px] w-4 bg-current" />
        </span>
      </Link>

      {open && (
        <>
          <Link
            href={closeHref}
            aria-hidden
            tabIndex={-1}
            className="fixed bottom-0 start-0 end-0 top-[68px] z-40 bg-black/55 xl:hidden"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={t("openMenu")}
            className="fixed bottom-0 start-0 top-[68px] z-50 flex w-[min(300px,84vw)] flex-col overflow-y-auto border-e border-hairline bg-surface shadow-[0_0_60px_rgb(0_0_0/0.6)] xl:hidden"
          >
            <div className="flex shrink-0 justify-end border-b border-hairline px-3 py-2.5">
              <Link
                href={closeHref}
                aria-label={t("closeMenu")}
                className="grid h-11 w-11 place-items-center rounded-[8px] border border-hairline text-[15px] text-ink-2 transition-colors hover:bg-raise hover:text-ink"
              >
                ×
              </Link>
            </div>
            {/* Navigating to another module changes the pathname, which drops
                the nav=1 param on its own — no explicit close-on-navigate
                wiring needed. */}
            <Sidebar role={role} variant="mobile" />
          </aside>
        </>
      )}
    </>
  );
}
