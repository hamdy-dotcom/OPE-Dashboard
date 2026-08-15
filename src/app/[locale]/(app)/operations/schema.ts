import { z } from "zod";

/**
 * Validation for a daily operation row.
 *
 * Messages are next-intl keys under `operations.error.*`, not prose — zod runs
 * on the server where there is no locale, so the form translates them.
 *
 * Two columns are deliberately absent from this schema:
 *   - `vendor_id`, filled by trg_dvo_vendor from the vehicle
 *   - `total_distance_km` / `battery_consumed_pct`, generated columns
 * and nothing here writes `vehicles.current_odometer_km` — trg_sync_odometer
 * owns it.
 */

const REQUIRED = "required";
const NOT_A_NUMBER = "number";
const NEGATIVE = "negative";
const PERCENT = "percent";
const END_BEFORE_START = "endBeforeStart";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requiredId = z
  .string()
  .trim()
  .refine((v) => UUID.test(v), { message: REQUIRED });

const optionalId = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || UUID.test(v), { message: REQUIRED });

const isoDate = z
  .string()
  .trim()
  .refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)), {
    message: REQUIRED,
  });

const requiredNumber = z
  .string()
  .trim()
  .min(1, { message: REQUIRED })
  .refine((v) => Number.isFinite(Number(v)), { message: NOT_A_NUMBER })
  .transform(Number);

const optionalNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || Number.isFinite(Number(v)), {
    message: NOT_A_NUMBER,
  })
  .transform((v) => (v === null ? null : Number(v)));

const nonNegative = requiredNumber.refine((n) => n >= 0, { message: NEGATIVE });

const optionalNonNegative = optionalNumber.refine((n) => n === null || n >= 0, {
  message: NEGATIVE,
});

const optionalPercent = optionalNumber.refine(
  (n) => n === null || (n >= 0 && n <= 100),
  { message: PERCENT },
);

const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === "" ? null : v));

export const operationSchema = z
  .object({
    operationDate: isoDate,
    shiftTypeId: requiredId,
    vehicleId: requiredId,
    driverId: requiredId,
    routeId: optionalId,
    startingKm: nonNegative,
    endingKm: optionalNonNegative,
    operatingPct: optionalPercent,
    startingBatteryPct: optionalPercent,
    endingBatteryPct: optionalPercent,
    driverTips: optionalNonNegative,
    remarks: optionalText,
  })
  // mirrors the table's own check constraint so the user sees it as a field
  // error rather than a database round trip
  .refine((v) => v.endingKm === null || v.endingKm >= v.startingKm, {
    message: END_BEFORE_START,
    path: ["endingKm"],
  });

export type OperationInput = z.infer<typeof operationSchema>;

/**
 * What a server action hands back to the form. Lives here rather than in
 * `actions.ts` because a `"use server"` module may only export async functions.
 */
export type OperationFormState = {
  /** next-intl key under `operations.error.*`, or null. */
  formError: string | null;
  /** field name -> next-intl key under `operations.error.*`. */
  fieldErrors: Record<string, string>;
};

export const EMPTY_FORM_STATE: OperationFormState = {
  formError: null,
  fieldErrors: {},
};

/** Field names the form renders, in the order errors should be reported. */
export const OPERATION_FIELDS = [
  "operationDate",
  "shiftTypeId",
  "vehicleId",
  "driverId",
  "routeId",
  "startingKm",
  "endingKm",
  "operatingPct",
  "startingBatteryPct",
  "endingBatteryPct",
  "driverTips",
  "remarks",
] as const;

export type OperationField = (typeof OPERATION_FIELDS)[number];

export function parseOperationForm(formData: FormData) {
  const read = (name: OperationField) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };

  return operationSchema.safeParse(
    Object.fromEntries(OPERATION_FIELDS.map((f) => [f, read(f)])),
  );
}

/** First message key per field — the form only has room for one. */
export function firstFieldErrors(
  error: z.ZodError<unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in out)) out[field] = issue.message;
  }
  return out;
}
