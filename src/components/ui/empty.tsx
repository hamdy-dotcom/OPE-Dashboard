import type { ReactNode } from "react";

/**
 * Empty state for a list. `action` is where the record actually gets made —
 * an empty state that names a record without offering a way to create one is
 * a dead end.
 */
export function Empty({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="px-4 py-14 text-center">
      <p className="text-sm text-ink-2">{title}</p>
      {hint && <p className="mt-1.5 text-[13px] text-ink-3">{hint}</p>}
      {action && <div className="mt-3.5 flex justify-center">{action}</div>}
    </div>
  );
}
