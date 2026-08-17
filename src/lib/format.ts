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

/**
 * A stored `timestamptz` as the value a `datetime-local` input expects, in the
 * caller's own timezone. Client-side only — on the server this renders in the
 * server's zone, which is not the one the user is reading.
 */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

/**
 * Document expiry, for licences and tourism IDs. Amber inside 30 days, red once
 * the date has passed. Purely presentational — nothing in the database tracks
 * this, so there is no view to defer to.
 */
export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryState = "expired" | "expiring" | "ok" | "unknown";

export function expiryState(
  date: string | null | undefined,
  today = new Date(),
): ExpiryState {
  if (!date) return "unknown";
  const parsed = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed)) return "unknown";

  const midnight = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const days = Math.floor((parsed - midnight) / 86_400_000);

  if (days < 0) return "expired";
  if (days <= EXPIRY_WARNING_DAYS) return "expiring";
  return "ok";
}

export const expiryTone = (s: ExpiryState): "neutral" | "warn" | "stop" =>
  s === "expired" ? "stop" : s === "expiring" ? "warn" : "neutral";

export type PmStatus =
  | "never_serviced"
  | "no_km_data"
  | "overdue"
  | "due_now"
  | "due_soon"
  | "ok";

export const pmTone = (s: PmStatus): "go" | "warn" | "stop" | "idle" =>
  s === "overdue" ? "stop" : s === "due_now" || s === "due_soon" ? "warn" : s === "ok" ? "go" : "idle";
