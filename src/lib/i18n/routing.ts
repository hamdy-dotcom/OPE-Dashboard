import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const dirOf = (locale: string): "ltr" | "rtl" =>
  locale === "ar" ? "rtl" : "ltr";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
