"use client";

import type { ReactNode } from "react";

/**
 * List card. Selected state lifts to --color-elev with a light rim, matching
 * the floating-card treatment in the design reference.
 */
export function RecordCard({
  selected = false,
  onSelect,
  children,
}: {
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
}) {
  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
        selected
          ? "relative z-[2] border-white/10 bg-elev rim-float"
          : "border-transparent hover:bg-raise"
      }`}
    >
      {children}
    </article>
  );
}

export function CardTop({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2.5">{children}</div>;
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <span className="tnum text-[17px] font-semibold tracking-[-0.02em]">
      {children}
    </span>
  );
}

export function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-[12.5px] text-ink-3">{children}</p>;
}

export function CardFoot({ children }: { children: ReactNode }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-3 border-t border-hairline pt-2.5">
      {children}
    </div>
  );
}
