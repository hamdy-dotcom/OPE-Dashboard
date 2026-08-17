"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "@/lib/i18n/routing";

/**
 * Search box above a record list. Writes the term to the URL so the list stays
 * a Server Component; debounced so typing does not fire a request per keystroke.
 * Changing the term drops the selection, which may no longer be listed.
 */
export function ListSearch({
  pathname,
  value,
  placeholder,
  extraQuery = {},
}: {
  pathname: string;
  value: string;
  placeholder: string;
  /** Filters that should survive a search, e.g. which entity is listed. */
  extraQuery?: Record<string, string>;
}) {
  const router = useRouter();
  const [term, setTerm] = useState(value);
  const [pending, start] = useTransition();
  const committed = useRef(value);

  useEffect(() => {
    if (term === committed.current) return;

    const timer = setTimeout(() => {
      committed.current = term;
      const query: Record<string, string> = { ...extraQuery };
      if (term.trim()) query.q = term.trim();
      start(() => router.replace({ pathname, query }));
    }, 300);

    return () => clearTimeout(timer);
  }, [term, pathname, extraQuery, router]);

  return (
    <div
      className={`border-b border-hairline px-4 py-3 transition-opacity ${
        pending ? "opacity-60" : ""
      }`}
    >
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full rounded-[10px] border border-hairline bg-canvas px-3 py-2 text-[13.5px] text-ink"
      />
    </div>
  );
}
