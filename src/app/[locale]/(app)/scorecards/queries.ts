import { createClient } from "@/lib/supabase/server";

/**
 * Read side of scorecards.
 *
 * Every vendor has its own KPI set — sections, names and weights are all per
 * vendor, so nothing here assumes a fixed list.
 *
 * The total achieved percentage comes from `v_scorecard_totals` and is never
 * worked out here. Section subtotals are a plain sum of their own lines, which
 * no view exposes.
 */

export type ScorecardStatus = "draft" | "submitted" | "approved" | "reopened";

export type ScorecardRow = {
  id: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  /** Null on a template. */
  periodMonth: string | null;
  isTemplate: boolean;
  status: ScorecardStatus;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  /** From v_scorecard_totals. */
  totalAchievedPct: number | null;
  sectionsWeightTotal: number | null;
  sectionCount: number;
  lineCount: number;
};

export type ScorecardLine = {
  id: string;
  kpiName: string;
  metricWeight: number;
  achievedPoints: number | null;
  notes: string | null;
  sortOrder: number;
};

export type ScorecardSection = {
  id: string;
  sectionName: string;
  sectionWeight: number;
  sortOrder: number;
  lines: ScorecardLine[];
};

export type VendorOption = { id: string; vendorCode: string; vendorName: string };

// vendor_scorecards reaches profiles twice (creator and approver), so the
// embed names the foreign key it means.
const SELECT = `
  id,
  vendor_id,
  period_month,
  is_template,
  status,
  notes,
  approved_at,
  vendors ( vendor_code, vendor_name ),
  profiles!approved_by ( full_name ),
  scorecard_sections ( id, scorecard_lines ( id ) )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

function toRow(
  s: any,
  totals: Map<string, { pct: number | null; weight: number | null }>,
): ScorecardRow {
  const vendor = one<any>(s.vendors);
  const approver = one<any>(s.profiles);
  const sections: any[] = Array.isArray(s.scorecard_sections) ? s.scorecard_sections : [];
  const total = totals.get(s.id);

  return {
    id: s.id,
    vendorId: s.vendor_id,
    vendorCode: vendor?.vendor_code ?? "—",
    vendorName: vendor?.vendor_name ?? "—",
    periodMonth: s.period_month,
    isTemplate: Boolean(s.is_template),
    status: s.status,
    notes: s.notes,
    approvedBy: approver?.full_name ?? null,
    approvedAt: s.approved_at,
    totalAchievedPct: total?.pct ?? null,
    sectionsWeightTotal: total?.weight ?? null,
    sectionCount: sections.length,
    lineCount: sections.reduce(
      (n, sec) => n + (Array.isArray(sec.scorecard_lines) ? sec.scorecard_lines.length : 0),
      0,
    ),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** scorecard_id -> the view's numbers. */
async function totalsFor(ids: string[]) {
  const out = new Map<string, { pct: number | null; weight: number | null }>();
  if (ids.length === 0) return out;

  const supabase = await createClient();
  const { data } = await supabase
    .from("v_scorecard_totals")
    .select("scorecard_id, total_achieved_pct, sections_weight_total")
    .in("scorecard_id", ids);

  for (const t of data ?? []) {
    out.set(t.scorecard_id as string, {
      pct: t.total_achieved_pct,
      weight: t.sections_weight_total,
    });
  }
  return out;
}

/** Templates and months are separate lists; they are never mixed. */
export async function loadScorecards(kind: "months" | "templates"): Promise<ScorecardRow[]> {
  const supabase = await createClient();

  let query = supabase.from("vendor_scorecards").select(SELECT);
  query =
    kind === "templates"
      ? query.is("period_month", null).order("vendor_id")
      : query.not("period_month", "is", null).order("period_month", { ascending: false });

  const { data } = await query;
  const rows = data ?? [];
  const totals = await totalsFor(rows.map((r) => r.id as string));

  return rows.map((r) => toRow(r, totals));
}

export async function loadScorecard(id: string): Promise<ScorecardRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_scorecards")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const totals = await totalsFor([id]);
  return toRow(data, totals);
}

/** The vendor's own sections and KPI lines, in their configured order. */
export async function loadSections(scorecardId: string): Promise<ScorecardSection[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scorecard_sections")
    .select(
      `id, section_name, section_weight, sort_order,
       scorecard_lines ( id, kpi_name, metric_weight, achieved_points, notes, sort_order )`,
    )
    .eq("scorecard_id", scorecardId)
    .order("sort_order");

  return (data ?? []).map((s) => ({
    id: s.id,
    sectionName: s.section_name,
    sectionWeight: Number(s.section_weight),
    sortOrder: s.sort_order,
    lines: (Array.isArray(s.scorecard_lines) ? s.scorecard_lines : [])
      .map((l) => ({
        id: l.id,
        kpiName: l.kpi_name,
        metricWeight: Number(l.metric_weight),
        achievedPoints: l.achieved_points === null ? null : Number(l.achieved_points),
        notes: l.notes,
        sortOrder: l.sort_order,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}

export async function loadVendorsWithTemplates(): Promise<{
  vendors: VendorOption[];
  /** Vendors that already have a template, so a month can be opened for them. */
  withTemplate: string[];
}> {
  const supabase = await createClient();

  const [vendors, templates] = await Promise.all([
    supabase.from("vendors").select("id, vendor_code, vendor_name").order("vendor_code"),
    supabase.from("vendor_scorecards").select("vendor_id").is("period_month", null),
  ]);

  return {
    vendors: (vendors.data ?? []).map((v) => ({
      id: v.id,
      vendorCode: v.vendor_code,
      vendorName: v.vendor_name,
    })),
    withTemplate: (templates.data ?? []).map((t) => t.vendor_id as string),
  };
}
