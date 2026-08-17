import { z } from "zod";
import {
  checkbox,
  optionalDate,
  optionalId,
  optionalText,
  readFields,
  requiredText,
} from "@/lib/forms";

/**
 * `vendorId` is optional — a null vendor means a company driver, which is a
 * real state rather than missing data.
 */
export const driverSchema = z.object({
  driverCode: requiredText(60),
  driverName: requiredText(200),
  mobileNumber: optionalText(40),
  hiringDate: optionalDate,
  licenseNumber: optionalText(60),
  licenseGradeId: optionalId,
  licenseExpiryDate: optionalDate,
  hasTourismId: checkbox,
  tourismIdIssuingCompany: optionalText(200),
  tourismIdExpiryDate: optionalDate,
  vendorId: optionalId,
  statusId: optionalId,
});

export type DriverInput = z.infer<typeof driverSchema>;

export const DRIVER_FIELDS = [
  "driverCode",
  "driverName",
  "mobileNumber",
  "hiringDate",
  "licenseNumber",
  "licenseGradeId",
  "licenseExpiryDate",
  "hasTourismId",
  "tourismIdIssuingCompany",
  "tourismIdExpiryDate",
  "vendorId",
  "statusId",
] as const;

export const parseDriverForm = (formData: FormData) =>
  driverSchema.safeParse(readFields(formData, DRIVER_FIELDS));
