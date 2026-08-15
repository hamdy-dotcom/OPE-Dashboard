import type { ReactNode } from "react";

export function KeyValue({ children }: { children: ReactNode }) {
  return <dl className="px-4 pb-1.5">{children}</dl>;
}

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
      <dt className="basis-[44%] text-[13px] text-ink-2">
        {label}
        {hint && <span className="ms-1.5 text-[11px] text-ink-3">{hint}</span>}
      </dt>
      <dd
        className={`flex-1 text-end text-[13.5px] ${muted ? "font-normal text-ink-2" : "font-medium"}`}
      >
        {children}
      </dd>
    </div>
  );
}
