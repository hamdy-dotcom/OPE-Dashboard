/** Shared formatters. Data is always English — only chrome is localised. */

export function km(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function money(value: number | null | undefined, currency = "EGP"): string {
  if (value === null || value === undefined) return "—";
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)} ${currency}`;
}

export function percent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}%`;
}

/** Minutes -> "2d 4h 13m". Matches fn_format_minutes in the database. */
export function duration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "—";
  const m = Math.max(0, Math.floor(minutes));
  const d = Math.floor(m / 1440);
  const h = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${mm}m`].filter(Boolean).join(" ");
}

export type PmStatus =
  | "never_serviced"
  | "no_km_data"
  | "overdue"
  | "due_now"
  | "due_soon"
  | "ok";

export const pmTone = (s: PmStatus): "go" | "warn" | "stop" | "idle" =>
  s === "overdue" ? "stop" : s === "due_now" || s === "due_soon" ? "warn" : s === "ok" ? "go" : "idle";
