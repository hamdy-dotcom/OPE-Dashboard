"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { guardMaster, isDenied } from "@/lib/master";
import { dbErrorToState, firstFieldErrors, type FormState } from "@/lib/forms";
import { parseVendorForm, type VendorInput } from "./schema";

const UNIQUE_FIELDS = { vendor_code: "vendorCode" };

function toRow(input: VendorInput) {
  return {
    vendor_code: input.vendorCode,
    vendor_name: input.vendorName,
    vendor_type_id: input.vendorTypeId,
    is_company: input.isCompany,
    contact_person: input.contactPerson,
    mobile_number: input.mobileNumber,
    email_address: input.emailAddress,
    billing_basis: input.billingBasis,
    rate_amount: input.rateAmount,
    apply_kpi: input.applyKpi,
    currency: input.currency,
    billing_notes: input.billingNotes,
    status_id: input.statusId,
  };
}

/**
 * There is exactly one company vendor. `one_company_vendor` is the authority;
 * this checks first so the message names the vendor already holding the flag
 * instead of surfacing a constraint violation.
 */
async function companyVendorTaken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  exceptId?: string,
) {
  let query = supabase.from("vendors").select("id").eq("is_company", true);
  if (exceptId) query = query.neq("id", exceptId);

  const { data } = await query.maybeSingle();
  return data !== null;
}

/** The unique index fires on `is_company`, not on a column named for it. */
const isCompanyClash = (e: { message?: string; details?: string | null }) =>
  `${e.message ?? ""} ${e.details ?? ""}`.includes("one_company_vendor");

export async function createVendor(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseVendorForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  if (parsed.data.isCompany && (await companyVendorTaken(supabase))) {
    return { formError: "companyVendorExists", fieldErrors: {} };
  }

  const { data, error } = await supabase
    .from("vendors")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) {
    if (isCompanyClash(error)) {
      return { formError: "companyVendorExists", fieldErrors: {} };
    }
    return dbErrorToState(error, UNIQUE_FIELDS);
  }

  revalidatePath("/[locale]/vendors", "page");
  return redirect({
    href: { pathname: "/vendors", query: { selected: data.id } },
    locale: gate.locale,
  });
}

export async function updateVendor(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseVendorForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();

  if (parsed.data.isCompany && (await companyVendorTaken(supabase, id))) {
    return { formError: "companyVendorExists", fieldErrors: {} };
  }

  const { error } = await supabase.from("vendors").update(toRow(parsed.data)).eq("id", id);

  if (error) {
    if (isCompanyClash(error)) {
      return { formError: "companyVendorExists", fieldErrors: {} };
    }
    return dbErrorToState(error, UNIQUE_FIELDS);
  }

  revalidatePath("/[locale]/vendors", "page");
  return redirect({
    href: { pathname: "/vendors", query: { selected: id } },
    locale: gate.locale,
  });
}
