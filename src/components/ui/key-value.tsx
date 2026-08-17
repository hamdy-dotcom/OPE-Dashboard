import type { ReactNode } from "react";

export function KeyValue({ children }: { children: ReactNode }) {
  return <dl className="px-4 pb-1.5">{children}</dl>;
}

/**
 * One label/value line.
 *
 * The value is a `<dd>`, which browsers give a 40px inline-start margin and
 * which, as a flex item, defaults to `min-width: auto` — so a long or
 * unbreakable value pushes past its column instead of wrapping. Both are
 * cancelled here rather than relying on a reset elsewhere, so the row is
 * contained wherever it is used.
 */
export function Row({
  label,
  hint,
  children,
  muted = false,
}: {
  label: ReactNode;
  hint?: string;
  children: ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-hairline py-2.5 last:border-b-0">
      <dt className="min-w-0 basis-[44%] text-[13px] text-ink-2">
        {label}
        {hint && <span className="ms-1.5 text-[11px] text-ink-3">{hint}</span>}
      </dt>
      <dd
        className={`m-0 min-w-0 flex-1 text-end text-[13.5px] break-words ${
          muted ? "font-normal text-ink-2" : "font-medium"
        }`}
      >
        {children}
      </dd>
    </div>
  );
}
