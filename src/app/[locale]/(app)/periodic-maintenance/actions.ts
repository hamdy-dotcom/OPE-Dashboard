"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { guardMaster, isDenied } from "@/lib/master";
import { type FormState } from "@/lib/forms";

/**
 * Seeds PM schedules for several vehicles at once.
 *
 * fn_init_pm_schedules decides which parts qualify and at what interval, and
 * then recalculates last_service_km from work order history — none of that is
 * repeated here, and `vehicle_part_schedules` is never written directly.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function buildPmSchedules(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const gate = await guardMaster();
  if (isDenied(gate)) return gate;

  const vehicleIds = formData
    .getAll("vehicleIds")
    .filter((v): v is string => typeof v === "string" && UUID.test(v));

  if (vehicleIds.length === 0) {
    return { formError: "noVehiclesSelected", fieldErrors: {} };
  }

  const supabase = await createClient();

  // Run together rather than one after another — seeding a whole fleet is the
  // point of this action.
  const results = await Promise.all(
    vehicleIds.map((id) =>
      supabase.rpc("fn_init_pm_schedules", { p_vehicle_id: id }),
    ),
  );

  const failed = results.filter((r) => r.error).length;

  revalidatePath("/[locale]/periodic-maintenance", "page");
  revalidatePath("/[locale]/vehicles", "page");

  if (failed > 0) {
    return {
      formError: failed === vehicleIds.length ? "buildFailed" : "buildPartlyFailed",
      fieldErrors: {},
      formErrorValues: { failed: String(failed), total: String(vehicleIds.length) },
    };
  }

  // Back to the board, which now has the seeded rows on it.
  return redirect({
    href: { pathname: "/periodic-maintenance", query: {} },
    locale: gate.locale,
  });
}
