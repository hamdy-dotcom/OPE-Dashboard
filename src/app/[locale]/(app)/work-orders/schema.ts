import { z } from "zod";
import { checkbox, optionalId, optionalText, readFields } from "@/lib/forms";

/**
 * `rfr_id` is not on the form — a work order is always raised from an RFR and
 * the id travels in the URL. `work_order_number` has a sequence default, so
 * nothing here generates it.
 *
 * Setting `repairEndAt` is what fires trg_wo_advance_pm; the schedule itself is
 * never touched from the application.
 */
const timestamp = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), { message: "required" });

export const workOrderSchema = z
  .object({
    assignedEngineerId: optionalId,
    maintenanceTypeId: optionalId,
    issueTypeId: optionalId,
    maintenanceCategoryId: optionalId,
    maintenanceCenterId: optionalId,
    repairStartAt: timestamp,
    repairEndAt: timestamp,
    technician1: optionalText(200),
    technician2: optionalText(200),
    technician3: optionalText(200),
    isSkipped: checkbox,
    skipReasonId: optionalId,
    skipNotes: optionalText(2000),
    vehicleStatusAfterId: optionalId,
    description: optionalText(2000),
  })
  // both mirror the table's own check constraints, so they read as field
  // errors rather than a failed round trip
  .refine((v) => !v.isSkipped || v.skipReasonId !== null, {
    message: "skipReasonRequired",
    path: ["skipReasonId"],
  })
  .refine(
    (v) =>
      v.repairEndAt === null ||
      v.repairStartAt === null ||
      Date.parse(v.repairEndAt) >= Date.parse(v.repairStartAt),
    { message: "endBeforeStart", path: ["repairEndAt"] },
  );

export type WorkOrderInput = z.infer<typeof workOrderSchema>;

export const WORK_ORDER_FIELDS = [
  "assignedEngineerId",
  "maintenanceTypeId",
  "issueTypeId",
  "maintenanceCategoryId",
  "maintenanceCenterId",
  "repairStartAt",
  "repairEndAt",
  "technician1",
  "technician2",
  "technician3",
  "isSkipped",
  "skipReasonId",
  "skipNotes",
  "vehicleStatusAfterId",
  "description",
] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Replaced parts post one entry per ticked box. */
export function readPartIds(formData: FormData): string[] {
  return formData
    .getAll("partIds")
    .filter((v): v is string => typeof v === "string" && UUID.test(v));
}

export const parseWorkOrderForm = (formData: FormData) =>
  workOrderSchema.safeParse(readFields(formData, WORK_ORDER_FIELDS));
