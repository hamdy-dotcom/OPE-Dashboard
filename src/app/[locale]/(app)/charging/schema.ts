import { z } from "zod";
import {
  optionalNonNegative,
  optionalPercent,
  optionalText,
  readFields,
  requiredId,
} from "@/lib/forms";

/**
 * `charging_duration` is absent on purpose — it is a generated column.
 *
 * Nothing here checks for a plug clash either: the trigger owns that rule and
 * the action translates its rejection.
 */
const timestamp = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), { message: "required" });

export const chargingSchema = z
  .object({
    vehicleId: requiredId,
    chargerId: requiredId,
    plugsUsed: z.enum(["A", "B", "A+B"], {
      errorMap: () => ({ message: "required" }),
    }),
    batteryStartPct: optionalPercent,
    batteryEndPct: optionalPercent,
    chargingStartTime: timestamp,
    chargingEndTime: timestamp,
    energyConsumedKwh: optionalNonNegative,
    notes: optionalText(2000),
  })
  // mirrors the table's own check so it reads as a field error
  .refine(
    (v) =>
      v.chargingEndTime === null ||
      v.chargingStartTime === null ||
      Date.parse(v.chargingEndTime) >= Date.parse(v.chargingStartTime),
    { message: "endBeforeStart", path: ["chargingEndTime"] },
  );

export type ChargingInput = z.infer<typeof chargingSchema>;

export const CHARGING_FIELDS = [
  "vehicleId",
  "chargerId",
  "plugsUsed",
  "batteryStartPct",
  "batteryEndPct",
  "chargingStartTime",
  "chargingEndTime",
  "energyConsumedKwh",
  "notes",
] as const;

export const parseChargingForm = (formData: FormData) =>
  chargingSchema.safeParse(readFields(formData, CHARGING_FIELDS));
