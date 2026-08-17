"use client";
import type { QueryParams } from "@/lib/filters";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/routing";

/**
 * Escape closes the drawer. Split out so `Drawer` itself stays a Server
 * Component — this renders nothing and only registers the key handler.
 */
export function DrawerDismiss({
  href,
}: {
  href: { pathname: string; query: QueryParams };
}) {
  const router = useRouter();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.replace(href);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, href]);

  return null;
}
