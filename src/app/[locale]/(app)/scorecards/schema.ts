import { z } from "zod";
import { readFields, requiredId } from "@/lib/forms";

/**
 * Opening a month is the only way a monthly scorecard comes into being —
 * fn_open_month copies the vendor's template. Nothing here builds one.
 */
export const openMonthSchema = z.object({
  vendorId: requiredId,
  // a month input posts YYYY-MM; the function truncates to the first anyway
  month: z
    .string()
    .trim()
    .refine((v) => /^\d{4}-\d{2}$/.test(v), { message: "required" })
    .transform((v) => `${v}-01`),
});

export const OPEN_MONTH_FIELDS = ["vendorId", "month"] as const;

export const parseOpenMonthForm = (formData: FormData) =>
  openMonthSchema.safeParse(readFields(formData, OPEN_MONTH_FIELDS));

/**
 * The vendor's KPI set, posted whole. Sections and lines are per vendor, so
 * this is a free-form tree rather than a known list.
 */
const draftLine = z.object({
  id: z.string().nullable(),
  kpiName: z.string().trim().min(1, { message: "required" }).max(200),
  metricWeight: z.number().min(0, { message: "negative" }),
});

const draftSection = z.object({
  id: z.string().nullable(),
  sectionName: z.string().trim().min(1, { message: "required" }).max(200),
  sectionWeight: z.number().min(0, { message: "negative" }),
  lines: z.array(draftLine),
});

export const templateDraftSchema = z.object({ sections: z.array(draftSection) });

export type TemplateDraft = z.infer<typeof templateDraftSchema>;

/** Creating a template needs the vendor it belongs to; editing already knows. */
export const newTemplateSchema = z.object({ vendorId: requiredId });

export const parseNewTemplateForm = (formData: FormData) =>
  newTemplateSchema.safeParse(readFields(formData, ["vendorId"] as const));

/** The editor posts the whole tree as JSON in one hidden field. */
export function parseTemplateDraft(formData: FormData) {
  const raw = formData.get("draft");
  if (typeof raw !== "string") {
    return { success: false as const, error: "saveFailed" as const };
  }

  try {
    const parsed = templateDraftSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return { success: false as const, error: "invalidTemplate" as const };
    return { success: true as const, data: parsed.data };
  } catch {
    return { success: false as const, error: "saveFailed" as const };
  }
}

/**
 * Achieved points, one field per line. The value is sent as typed — the cap at
 * metric_weight belongs to trg_cap_achieved, not to this form.
 */
export function readAchievedPoints(formData: FormData): Map<string, number | null> {
  const out = new Map<string, number | null>();

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("line:") || typeof value !== "string") continue;
    const id = key.slice(5);
    const trimmed = value.trim();

    if (trimmed === "") {
      out.set(id, null);
      continue;
    }
    if (Number.isFinite(Number(trimmed))) out.set(id, Number(trimmed));
  }

  return out;
}

export const SCORECARD_STATUSES = ["draft", "submitted", "approved", "reopened"] as const;

export const statusChangeSchema = z.object({
  status: z.enum(SCORECARD_STATUSES, {
    errorMap: () => ({ message: "required" }),
  }),
});

export const parseStatusChange = (formData: FormData) =>
  statusChangeSchema.safeParse(readFields(formData, ["status"] as const));
