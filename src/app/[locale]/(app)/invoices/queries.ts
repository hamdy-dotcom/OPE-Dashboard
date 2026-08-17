import { createClient } from "@/lib/supabase/server";

/**
 * Read side of invoicing. Every figure on an invoice was written by
 * fn_generate_invoice; nothing here recalculates any of it.
 *
 * Bus counts come from `v_vendor_monthly_bus_counts`, derived from actual
 * operations, and are never hand-entered.
 */

export type InvoiceStatus = "draft" | "submitted" | "approved" | "paid";

export type InvoiceRow = {
  id: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  periodMonth: string;
  billingBasis: string | null;
  rateAmount: number | null;
  busQuantity: number | null;
  grossAmount: number | null;
  achievedPct: number | null;
  netAmount: number | null;
  currency: string;
  status: InvoiceStatus;
  notes: string | null;
  scorecardId: string | null;
};

/** The operational inputs behind the invoice, so a figure can be traced. */
export type BusCounts = {
  busDays: number | null;
  operatingDays: number | null;
  avgDailyBuses: number | null;
};

export type InvoiceVendor = {
  id: string;
  vendorCode: string;
  vendorName: string;
  billingBasis: string | null;
  applyKpi: boolean;
};

const SELECT = `
  id,
  vendor_id,
  period_month,
  scorecard_id,
  billing_basis,
  rate_amount,
  bus_quantity,
  gross_amount,
  achieved_pct,
  net_amount,
  currency,
  status,
  notes,
  vendors ( vendor_code, vendor_name )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

function toRow(i: any): InvoiceRow {
  const vendor = one<any>(i.vendors);
  return {
    id: i.id,
    vendorId: i.vendor_id,
    vendorCode: vendor?.vendor_code ?? "—",
    vendorName: vendor?.vendor_name ?? "—",
    periodMonth: i.period_month,
    billingBasis: i.billing_basis,
    rateAmount: i.rate_amount,
    busQuantity: i.bus_quantity,
    grossAmount: i.gross_amount,
    achievedPct: i.achieved_pct,
    netAmount: i.net_amount,
    currency: i.currency,
    status: i.status,
    notes: i.notes,
    scorecardId: i.scorecard_id,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function loadInvoices(): Promise<InvoiceRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_invoices")
    .select(SELECT)
    .order("period_month", { ascending: false })
    .limit(200);

  return (data ?? []).map(toRow);
}

export async function loadInvoice(id: string): Promise<InvoiceRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendor_invoices")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  return data ? toRow(data) : null;
}

/** The month's operational counts, exactly as the invoice function saw them. */
export async function loadBusCounts(
  vendorId: string,
  periodMonth: string,
): Promise<BusCounts | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_vendor_monthly_bus_counts")
    .select("bus_days, operating_days, avg_daily_buses")
    .eq("vendor_id", vendorId)
    .eq("period_month", periodMonth)
    .maybeSingle();

  if (!data) return null;
  return {
    busDays: data.bus_days,
    operatingDays: data.operating_days,
    avgDailyBuses: data.avg_daily_buses,
  };
}

export async function loadInvoiceVendors(): Promise<InvoiceVendor[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, vendor_code, vendor_name, billing_basis, apply_kpi")
    .order("vendor_code");

  return (data ?? []).map((v) => ({
    id: v.id,
    vendorCode: v.vendor_code,
    vendorName: v.vendor_name,
    billingBasis: v.billing_basis,
    applyKpi: v.apply_kpi,
  }));
}
