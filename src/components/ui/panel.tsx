import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-[14px] bg-surface rim ${className}`}
    >
      {children}
    </section>
  );
}

export function PanelHead({
  title,
  actions,
}: {
  title: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2.5 border-b border-hairline px-4 py-3">
      <h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>
      {actions && (
        <div className="ms-auto flex gap-3.5 text-xs text-ink-3">{actions}</div>
      )}
    </header>
  );
}

export function Section({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="border-t border-hairline px-4 py-4">
      {title && (
        <h3 className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
