"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { guardMaster, isDenied } from "@/lib/master";
import { dbErrorToState, firstFieldErrors, type FormState } from "@/lib/forms";
import { parseDriverForm, type DriverInput } from "./schema";

const UNIQUE_FIELDS = { driver_code: "driverCode" };

function toRow(input: DriverInput) {
  return {
    driver_code: input.driverCode,
    driver_name: input.driverName,
    mobile_number: input.mobileNumber,
    hiring_date: input.hiringDate,
    license_number: input.licenseNumber,
    license_grade_id: input.licenseGradeId,
    license_expiry_date: input.licenseExpiryDate,
    has_tourism_id: input.hasTourismId,
    // only meaningful while the driver actually holds a tourism ID
    tourism_id_issuing_company: input.hasTourismId
      ? input.tourismIdIssuingCompany
      : null,
    tourism_id_expiry_date: input.hasTourismId ? input.tourismIdExpiryDate : null,
    vendor_id: input.vendorId,
    status_id: input.statusId,
  };
}

export async function createDriver(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseDriverForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("drivers")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) return dbErrorToState(error, UNIQUE_FIELDS);

  revalidatePath("/[locale]/drivers", "page");
  return redirect({
    href: { pathname: "/drivers", query: { selected: data.id } },
    locale: gate.locale,
  });
}

export async function updateDriver(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseDriverForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("drivers").update(toRow(parsed.data)).eq("id", id);

  if (error) return dbErrorToState(error, UNIQUE_FIELDS);

  revalidatePath("/[locale]/drivers", "page");
  return redirect({
    href: { pathname: "/drivers", query: { selected: id } },
    locale: gate.locale,
  });
}
