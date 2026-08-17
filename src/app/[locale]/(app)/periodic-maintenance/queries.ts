import { createClient } from "@/lib/supabase/server";
import type { PmStatus } from "@/lib/format";

/**
 * The periodic-maintenance board reads `v_periodic_maintenance` and nothing
 * else. Status, scheduled KM and km_remaining are all the view's — including
 * the negative remaining on an overdue part, which is left exactly as reported.
 */

export type PmRow = {
  /** The schedule row's id; the drawer opens the vehicle, not this. */
  id: string;
  vehicleId: string;
  vehicleCode: string;
  plateNumber: string;
  partCode: string;
  partName: string;
  status: PmStatus;
  intervalKm: number | null;
  lastServiceKm: number | null;
  scheduledKm: number | null;
  actualKm: number | null;
  kmRemaining: number | null;
};

/** Most urgent first: overdue (negative remaining) at the top. */
const URGENCY: Record<string, number> = {
  overdue: 0,
  due_now: 1,
  due_soon: 2,
  never_serviced: 3,
  no_km_data: 4,
  ok: 5,
};

export async function loadPmBoard(search: string): Promise<PmRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("v_periodic_maintenance")
    .select(
      `schedule_id, vehicle_id, vehicle_code, plate_number, part_code, part_name,
       maintenance_status, interval_km, last_service_km, scheduled_km, actual_km,
       km_remaining`,
    )
    .order("km_remaining", { ascending: true, nullsFirst: false });

  if (search.trim()) {
    const term = `%${search.trim()}%`;
    query = query.or(
      `vehicle_code.ilike.${term},plate_number.ilike.${term},part_name.ilike.${term}`,
    );
  }

  const { data } = await query;

  const rows: PmRow[] = (data ?? []).map((p) => ({
    id: String(p.schedule_id),
    vehicleId: String(p.vehicle_id),
    vehicleCode: p.vehicle_code ?? "—",
    plateNumber: p.plate_number ?? "—",
    partCode: p.part_code ?? "—",
    partName: p.part_name ?? "—",
    status: (p.maintenance_status ?? "no_km_data") as PmStatus,
    intervalKm: p.interval_km,
    lastServiceKm: p.last_service_km,
    scheduledKm: p.scheduled_km,
    actualKm: p.actual_km,
    kmRemaining: p.km_remaining,
  }));

  // Grouped by urgency, then by how far past or short of the threshold each is.
  return rows.sort((a, b) => {
    const byStatus = (URGENCY[a.status] ?? 9) - (URGENCY[b.status] ?? 9);
    if (byStatus !== 0) return byStatus;
    if (a.kmRemaining === null) return 1;
    if (b.kmRemaining === null) return -1;
    return a.kmRemaining - b.kmRemaining;
  });
}

export type SeedableVehicle = {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  vendorName: string | null;
};

/**
 * Vehicles with no PM schedule at all — the ones fn_init_pm_schedules still has
 * work to do on. The function is idempotent, but offering a bus that is already
 * seeded would suggest there is something to do when there isn't.
 */
export async function loadVehiclesWithoutSchedule(): Promise<SeedableVehicle[]> {
  const supabase = await createClient();

  // Two reads and a set difference: PostgREST has no "not exists" filter, and
  // the schedule table is one uuid column wide.
  const [vehicles, scheduled] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, vehicle_code, plate_number, vendors ( vendor_name )")
      .order("vehicle_code"),
    supabase.from("vehicle_part_schedules").select("vehicle_id"),
  ]);

  const seeded = new Set((scheduled.data ?? []).map((s) => s.vehicle_id as string));

  return (vehicles.data ?? [])
    .filter((v) => !seeded.has(v.id))
    .map((v) => {
      const vendor = Array.isArray(v.vendors) ? v.vendors[0] : v.vendors;
      return {
        id: v.id,
        vehicleCode: v.vehicle_code,
        plateNumber: v.plate_number,
        vendorName: vendor?.vendor_name ?? null,
      };
    });
}
