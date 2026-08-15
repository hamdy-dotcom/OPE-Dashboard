export type StageState = "done" | "now" | "skip" | "todo";

export type Stage = {
  code: string;
  label: string;
  state: StageState;
};

/**
 * Horizontal rail of RFR stages. Completed segments are ink, the current stage
 * is a green node with a soft halo, skipped stages are struck through.
 */
export function StageRail({ stages }: { stages: Stage[] }) {
  return (
    <ol className="flex items-start">
      {stages.map((s, i) => {
        const filled = s.state === "done" || s.state === "now";
        return (
          <li key={s.code} className="relative min-w-0 flex-1 text-center">
            {i > 0 && (
              <span
                aria-hidden
                className={`absolute top-[5px] h-[1.5px] w-full ${filled ? "bg-ink" : "bg-hairline"}`}
                style={{ insetInlineStart: "-50%" }}
              />
            )}
            <span
              aria-hidden
              className={`relative z-[2] mx-auto mb-2 block h-[11px] w-[11px] rounded-full ${
                s.state === "done"
                  ? "bg-ink"
                  : s.state === "now"
                    ? "bg-go shadow-[0_0_0_4px_var(--color-go-soft)]"
                    : "bg-idle"
              }`}
            />
            <span
              className={`block text-[9.5px] font-semibold uppercase leading-tight tracking-[0.05em] ${
                filled ? "text-ink" : "text-ink-3"
              } ${s.state === "skip" ? "line-through" : ""}`}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
