"use client";

import { useMemo, useState } from "react";
import { FieldGroup, TextInput } from "@/components/ui/field";
import { Micro } from "@/components/ui/micro";
import { km } from "@/lib/format";

/** Anything with a code and a plate can be picked; modules pass their own rows. */
export type PickableVehicle = {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  currentOdometerKm: number | null;
};

/**
 * Searchable vehicle chooser. Matches on plate number and vehicle code — the
 * two things written on the bus — and carries the id in a hidden input so the
 * form still posts as plain FormData.
 *
 * Labels come from the caller so each module keeps its own message namespace.
 */
export function VehiclePicker<T extends PickableVehicle>({
  name = "vehicleId",
  vehicles,
  value,
  onChange,
  error,
  labels,
}: {
  name?: string;
  vehicles: T[];
  value: string;
  onChange: (vehicle: T) => void;
  error?: string;
  labels: {
    field: string;
    search: string;
    noMatch: string;
    odometer: (formattedKm: string) => string;
  };
}) {
  const [query, setQuery] = useState("");

  const selected = vehicles.find((v) => v.id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plateNumber.toLowerCase().includes(q) ||
        v.vehicleCode.toLowerCase().includes(q),
    );
  }, [vehicles, query]);

  return (
    <FieldGroup label={labels.field} error={error}>
      <input type="hidden" name={name} value={value} />

      {selected && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[10px] border border-hairline bg-elev px-3 py-2.5">
          <span className="tnum text-[15px] font-semibold">{selected.vehicleCode}</span>
          <span className="tnum text-[13px] text-ink-2">{selected.plateNumber}</span>
          <span className="ms-auto">
            <Micro bar={false}>{labels.odometer(km(selected.currentOdometerKm))}</Micro>
          </span>
        </div>
      )}

      <TextInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={labels.search}
        aria-label={labels.search}
        autoComplete="off"
      />

      <div className="mt-1.5 max-h-60 overflow-y-auto rounded-[10px] border border-hairline">
        {matches.length === 0 ? (
          <p className="px-3 py-4 text-center text-[13px] text-ink-3">{labels.noMatch}</p>
        ) : (
          <ul>
            {matches.map((v) => {
              const isSelected = v.id === value;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => onChange(v)}
                    aria-pressed={isSelected}
                    className={`flex w-full items-baseline gap-2.5 border-b border-hairline px-3 py-3 text-start transition-colors last:border-b-0 ${
                      isSelected ? "bg-elev" : "hover:bg-raise"
                    }`}
                  >
                    <span className="tnum text-[14px] font-semibold">{v.vehicleCode}</span>
                    <span className="tnum text-[13px] text-ink-2">{v.plateNumber}</span>
                    <span className="tnum ms-auto text-[12px] text-ink-3">
                      {km(v.currentOdometerKm)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FieldGroup>
  );
}
