"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/routing";
import {
  CardFoot,
  CardTop,
  Code,
  RecordCard,
  Sub,
} from "@/components/ui/record-card";
import { Pill } from "@/components/ui/pill";
import { Micro } from "@/components/ui/micro";
import { KmMeter } from "@/components/ui/km-meter";
import type { OperationRow, ShiftOption } from "./queries";

/**
 * Record list, same shape as the day board's. Selection is written to the URL
 * so the detail panel can stay on the server; local state echoes it first so
 * the card highlights without waiting for the round trip.
 */
export function OperationsList({
  rows,
  shifts,
  selectedId,
  query,
}: {
  rows: OperationRow[];
  shifts: ShiftOption[];
  selectedId: string | null;
  query: Record<string, string>;
}) {
  const t = useTranslations("operations");
  const tStatus = useTranslations("status");
  const tShift = useTranslations("shift");
  const router = useRouter();
  const [, start] = useTransition();
  // Highlights immediately, then falls back to whatever the URL settles on.
  const [active, setActive] = useOptimistic(selectedId);

  const shiftLabel = (id: string | null) => {
    const s = shifts.find((x) => x.id === id);
    if (!s) return null;
    return tShift.has(s.code) ? tShift(s.code) : s.labelEn;
  };

  const select = (id: string) =>
    start(() => {
      setActive(id);
      router.replace({ pathname: "/operations", query: { ...query, selected: id } });
    });

  return (
    <div className="p-1.5">
      {rows.map((r) => {
        const noEnd = r.endKm === null;
        const shift = shiftLabel(r.shiftId);

        return (
          <RecordCard
            key={r.id}
            selected={active === r.id}
            onSelect={() => select(r.id)}
          >
            <CardTop>
              <Code>{r.vehicleCode}</Code>
              <Pill tone={noEnd ? "warn" : "go"}>
                {noEnd ? tStatus("noEndKm") : tStatus("operating")}
              </Pill>
              {shift && (
                <span className="ms-auto">
                  <Micro bar={false}>{shift}</Micro>
                </span>
              )}
            </CardTop>

            <Sub>
              {r.plate}
              {r.vendorName ? ` · ${r.vendorName}` : ""} · {r.date}
            </Sub>

            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <span className="text-[13.5px]">{r.driverName ?? "—"}</span>
              {r.driverCode && <Micro bar={false}>{r.driverCode}</Micro>}
              {r.routeName && (
                <span className="ms-auto text-[12.5px] text-ink-3">{r.routeName}</span>
              )}
            </div>

            <div className="mt-2.5">
              <KmMeter
                startKm={r.startKm}
                endKm={r.endKm}
                right={
                  r.batteryStart !== null && r.batteryEnd !== null
                    ? t("battery", { from: r.batteryStart, to: r.batteryEnd })
                    : undefined
                }
              />
            </div>

            <CardFoot>
              <Micro bar={false}>{r.code}</Micro>
              {r.operatingPct !== null && (
                <span className="ms-auto">
                  <Micro tone="go">{t("operatingPct", { pct: r.operatingPct })}</Micro>
                </span>
              )}
            </CardFoot>
          </RecordCard>
        );
      })}
    </div>
  );
}
