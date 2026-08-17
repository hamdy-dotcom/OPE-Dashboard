"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { guardMaster, isDenied } from "@/lib/master";
import { dbErrorToState, firstFieldErrors, type FormState } from "@/lib/forms";
import { parseVehicleForm, type VehicleInput } from "./schema";

/**
 * Vehicle master data. Supervisor and above only — `guardMaster` rejects
 * `data_admin` here as well as hiding the buttons, and RLS rejects it again.
 */

const UNIQUE_FIELDS = {
  vehicle_code: "vehicleCode",
  plate_number: "plateNumber",
};

function toRow(input: VehicleInput) {
  return {
    vehicle_code: input.vehicleCode,
    plate_number: input.plateNumber,
    vendor_id: input.vendorId,
    vehicle_type_id: input.vehicleTypeId,
    fuel_type_id: input.fuelTypeId,
    battery_capacity_kwh: input.batteryCapacityKwh,
    license_expiry_date: input.licenseExpiryDate,
    default_driver_id: input.defaultDriverId,
    status_id: input.statusId,
  };
}

export async function createVehicle(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) return dbErrorToState(error, UNIQUE_FIELDS);

  revalidatePath("/[locale]/vehicles", "page");
  return redirect({
    href: { pathname: "/vehicles", query: { selected: data.id } },
    locale: gate.locale,
  });
}

export async function updateVehicle(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const parsed = parseVehicleForm(formData);
  if (!parsed.success) {
    return { formError: null, fieldErrors: firstFieldErrors(parsed.error) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(toRow(parsed.data)).eq("id", id);

  if (error) return dbErrorToState(error, UNIQUE_FIELDS);

  revalidatePath("/[locale]/vehicles", "page");
  return redirect({
    href: { pathname: "/vehicles", query: { selected: id } },
    locale: gate.locale,
  });
}

/**
 * Seeds this vehicle's PM schedule from the parts catalogue. The function owns
 * which parts qualify and what the intervals are; nothing is decided here.
 */
export async function buildPmSchedule(
  vehicleId: string,
  _prev: FormState,
  _formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const supabase = await createClient();
  const { error } = await supabase.rpc("fn_init_pm_schedules", {
    p_vehicle_id: vehicleId,
  });

  if (error) return dbErrorToState(error);

  revalidatePath("/[locale]/vehicles", "page");
  return { formError: null, fieldErrors: {} };
}
