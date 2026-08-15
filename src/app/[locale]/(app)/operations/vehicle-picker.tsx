"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FieldGroup, TextInput } from "@/components/ui/field";
import { Micro } from "@/components/ui/micro";
import { km } from "@/lib/format";
import type { VehicleOption } from "./queries";

/**
 * Searchable vehicle chooser. Matches on plate number and vehicle code — the
 * two things written on the bus — and carries the id in a hidden input so the
 * form still posts as plain FormData.
 */
export function VehiclePicker({
  vehicles,
  value,
  onChange,
  error,
}: {
  vehicles: VehicleOption[];
  value: string;
  onChange: (vehicle: VehicleOption) => void;
  error?: string;
}) {
  const t = useTranslations("operations");
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
    <FieldGroup label={t("field.vehicle")} error={error}>
      <input type="hidden" name="vehicleId" value={value} />

      {selected && (
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 rounded-[10px] border border-hairline bg-elev px-3 py-2.5">
          <span className="tnum text-[15px] font-semibold">
            {selected.vehicleCode}
          </span>
          <span className="tnum text-[13px] text-ink-2">{selected.plateNumber}</span>
          <span className="ms-auto">
            <Micro bar={false}>
              {t("odometerNow", { km: km(selected.currentOdometerKm) })}
            </Micro>
          </span>
        </div>
      )}

      <TextInput
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchVehicles")}
        aria-label={t("searchVehicles")}
        autoComplete="off"
      />

      <div className="mt-1.5 max-h-60 overflow-y-auto rounded-[10px] border border-hairline">
        {matches.length === 0 ? (
          <p className="px-3 py-4 text-center text-[13px] text-ink-3">
            {t("noVehicleMatch")}
          </p>
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
                    <span className="tnum text-[14px] font-semibold">
                      {v.vehicleCode}
                    </span>
                    <span className="tnum text-[13px] text-ink-2">
                      {v.plateNumber}
                    </span>
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
