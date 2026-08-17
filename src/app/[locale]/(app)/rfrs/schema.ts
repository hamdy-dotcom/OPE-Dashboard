import { z } from "zod";
import {
  optionalId,
  optionalNonNegative,
  readFields,
  requiredId,
  requiredText,
} from "@/lib/forms";

/**
 * `driverId` and `odometerKm` are optional here on purpose. Leaving them blank
 * sends null, and trg_rfr_autofill fills them from the last operation on or
 * before the request date. Nothing in TypeScript works those values out.
 *
 * `stage_id` is absent too — an RFR is always created Pending, and after that
 * only the stage action moves it.
 */
export const rfrSchema = z.object({
  requestAt: z
    .string()
    .trim()
    .min(1, { message: "required" })
    .refine((v) => !Number.isNaN(Date.parse(v)), { message: "required" }),
  vehicleId: requiredId,
  driverId: optionalId,
  odometerKm: optionalNonNegative,
  vehicleLocation: requiredText(200),
  description: requiredText(2000),
});

export type RfrInput = z.infer<typeof rfrSchema>;

export const RFR_FIELDS = [
  "requestAt",
  "vehicleId",
  "driverId",
  "odometerKm",
  "vehicleLocation",
  "description",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checkboxes post one entry per tick, so this field is read separately. */
export function readIssueTypeIds(formData: FormData): string[] {
  return formData
    .getAll("issueTypeIds")
    .filter((v): v is string => typeof v === "string" && UUID.test(v));
}

export const parseRfrForm = (formData: FormData) =>
  rfrSchema.safeParse(readFields(formData, RFR_FIELDS));

/**
 * A stage move. `skipReasonId` is only meaningful when the target stage is the
 * whole-request Skipped one; the action checks that.
 */
export const stageChangeSchema = z.object({
  stageId: requiredId,
  skipReasonId: optionalId,
});

export const STAGE_CHANGE_FIELDS = ["stageId", "skipReasonId"] as const;

export const parseStageChangeForm = (formData: FormData) =>
  stageChangeSchema.safeParse(readFields(formData, STAGE_CHANGE_FIELDS));

/** Skipping a single issue needs a reason; un-skipping clears it. */
export const issueSkipSchema = z.object({
  intent: z.enum(["skip", "unskip"], {
    errorMap: () => ({ message: "required" }),
  }),
  rfrIssueId: requiredId,
  skipReasonId: optionalId,
});

export const ISSUE_SKIP_FIELDS = ["intent", "rfrIssueId", "skipReasonId"] as const;

export const parseIssueSkipForm = (formData: FormData) =>
  issueSkipSchema.safeParse(readFields(formData, ISSUE_SKIP_FIELDS));
