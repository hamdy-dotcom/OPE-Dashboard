import { createClient } from "@/lib/supabase/server";

/** A row from the `lookups` table, reduced to what a picker needs. */
export type LookupOption = { id: string; code: string; labelEn: string };

export type LookupCategory =
  | "vendor_type"
  | "vehicle_type"
  | "fuel_type"
  | "license_grade"
  | "shift_type"
  | "generic_status"
  | "rfr_stage"
  | "issue_type"
  | "skip_reason"
  | "maintenance_type"
  | "maintenance_category"
  | "vehicle_status_after";

export async function loadLookups(
  category: LookupCategory,
): Promise<LookupOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lookups")
    .select("id, code, label_en")
    .eq("category", category)
    .eq("is_active", true)
    .order("sort_order");

  return (data ?? []).map((l) => ({
    id: l.id,
    code: l.code,
    labelEn: l.label_en,
  }));
}

/** Several categories in one round of queries. */
export async function loadLookupSets<T extends LookupCategory>(
  categories: readonly T[],
): Promise<Record<T, LookupOption[]>> {
  const lists = await Promise.all(categories.map((c) => loadLookups(c)));
  return Object.fromEntries(
    categories.map((c, i) => [c, lists[i]]),
  ) as Record<T, LookupOption[]>;
}

/**
 * Lookup labels are data, not chrome, so they render as stored — except where
 * a matching UI message exists (shifts), which each caller decides.
 */
export const lookupLabel = (
  options: LookupOption[],
  id: string | null,
): string | null => options.find((o) => o.id === id)?.labelEn ?? null;
