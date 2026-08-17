import { createClient } from "@/lib/supabase/server";
import { loadLookups } from "@/lib/lookups";
import type { PlugSelection } from "./plugs";

/**
 * Read side of charging sessions.
 *
 * `charging_duration` is a generated column — it is read, never written and
 * never worked out here.
 */

export type ChargingRow = {
  id: string;
  sessionCode: string;
  vehicleId: string;
  vehicleCode: string;
  plateNumber: string;
  chargerId: string;
  chargerCode: string;
  chargerLocation: string | null;
  plugsUsed: PlugSelection;
  batteryStartPct: number | null;
  batteryEndPct: number | null;
  startTime: string | null;
  endTime: string | null;
  /** Postgres interval, straight from the generated column. */
  duration: string | null;
  energyKwh: number | null;
  notes: string | null;
};

export type ChargingFormValues = {
  vehicleId: string;
  chargerId: string;
  plugsUsed: string;
  batteryStartPct: string;
  batteryEndPct: string;
  chargingStartTime: string;
  chargingEndTime: string;
  energyConsumedKwh: string;
  notes: string;
};

export type ChargingOptions = {
  /** Electric vehicles only — nothing else can take a charging session. */
  vehicles: {
    id: string;
    vehicleCode: string;
    plateNumber: string;
    currentOdometerKm: number | null;
  }[];
  chargers: { id: string; chargerCode: string; chargerLocation: string | null }[];
};

const SELECT = `
  id,
  charging_session_code,
  vehicle_id,
  charger_id,
  plugs_used,
  battery_start_pct,
  battery_end_pct,
  charging_start_time,
  charging_end_time,
  charging_duration,
  energy_consumed_kwh,
  notes,
  vehicles ( vehicle_code, plate_number ),
  chargers ( charger_code, charger_location )
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

function toRow(s: any): ChargingRow {
  const vehicle = one<any>(s.vehicles);
  const charger = one<any>(s.chargers);

  return {
    id: s.id,
    sessionCode: s.charging_session_code,
    vehicleId: s.vehicle_id,
    vehicleCode: vehicle?.vehicle_code ?? "—",
    plateNumber: vehicle?.plate_number ?? "—",
    chargerId: s.charger_id,
    chargerCode: charger?.charger_code ?? "—",
    chargerLocation: charger?.charger_location ?? null,
    plugsUsed: s.plugs_used,
    batteryStartPct: s.battery_start_pct,
    batteryEndPct: s.battery_end_pct,
    startTime: s.charging_start_time,
    endTime: s.charging_end_time,
    duration: s.charging_duration,
    energyKwh: s.energy_consumed_kwh,
    notes: s.notes,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function loadChargingSessions(search: string): Promise<ChargingRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("charging_sessions")
    .select(SELECT)
    .order("charging_start_time", { ascending: false, nullsFirst: false })
    .limit(200);

  const rows = (data ?? []).map(toRow);
  const q = search.trim().toLowerCase();
  if (!q) return rows;

  // Vehicle and charger codes live in embedded tables, which PostgREST cannot
  // filter on, so the narrowing happens over the fetched page.
  return rows.filter((r) =>
    [r.sessionCode, r.vehicleCode, r.plateNumber, r.chargerCode]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

export async function loadChargingSession(id: string): Promise<ChargingRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("charging_sessions")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();

  return data ? toRow(data) : null;
}

export async function loadChargingOptions(): Promise<ChargingOptions> {
  const supabase = await createClient();

  const fuelTypes = await loadLookups("fuel_type");
  const electricId = fuelTypes.find((f) => f.code === "electric")?.id ?? null;

  const [vehicles, chargers] = await Promise.all([
    electricId
      ? supabase
          .from("vehicles")
          .select("id, vehicle_code, plate_number, current_odometer_km")
          .eq("fuel_type_id", electricId)
          .order("vehicle_code")
      : Promise.resolve({ data: [] as never[] }),
    supabase
      .from("chargers")
      .select("id, charger_code, charger_location")
      .order("charger_code"),
  ]);

  return {
    vehicles: (vehicles.data ?? []).map((v) => ({
      id: v.id,
      vehicleCode: v.vehicle_code,
      plateNumber: v.plate_number,
      currentOdometerKm: v.current_odometer_km,
    })),
    chargers: (chargers.data ?? []).map((c) => ({
      id: c.id,
      chargerCode: c.charger_code,
      chargerLocation: c.charger_location,
    })),
  };
}

export function toChargingFormValues(row: ChargingRow): ChargingFormValues {
  const n = (v: number | null) => (v === null ? "" : String(v));
  return {
    vehicleId: row.vehicleId,
    chargerId: row.chargerId,
    plugsUsed: row.plugsUsed,
    batteryStartPct: n(row.batteryStartPct),
    batteryEndPct: n(row.batteryEndPct),
    chargingStartTime: row.startTime ?? "",
    chargingEndTime: row.endTime ?? "",
    energyConsumedKwh: n(row.energyKwh),
    notes: row.notes ?? "",
  };
}

export const EMPTY_CHARGING_FORM: ChargingFormValues = {
  vehicleId: "",
  chargerId: "",
  plugsUsed: "A",
  batteryStartPct: "",
  batteryEndPct: "",
  chargingStartTime: "",
  chargingEndTime: "",
  energyConsumedKwh: "",
  notes: "",
};
