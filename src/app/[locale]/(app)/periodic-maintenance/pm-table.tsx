"use client";

import { useTranslations } from "next-intl";
import { DataTable, orDash, type Column } from "@/components/ui/data-table";
import { Empty } from "@/components/ui/empty";
import { Micro } from "@/components/ui/micro";
import { km, pmTone, type PmStatus } from "@/lib/format";
import type { PmRow } from "./queries";

const PM_STATUS_KEY: Record<string, string> = {
  overdue: "overdue",
  due_now: "dueNow",
  due_soon: "dueSoon",
  never_serviced: "neverServiced",
  no_km_data: "noKmData",
  ok: "ok",
};

const microTone = (status: PmStatus): "neutral" | "go" | "warn" | "stop" => {
  const tone = pmTone(status);
  return tone === "idle" ? "neutral" : tone;
};

/**
 * Rows are vehicle-part schedules, but selecting one opens the *vehicle*
 * drawer — hence `?id=` carries the vehicle id, not the schedule id.
 */
export function PmTable({
  rows,
  selectedVehicleId,
  query,
  sort,
  dir,
}: {
  rows: PmRow[];
  selectedVehicleId: string | null;
  query: Record<string, string>;
  sort: string;
  dir: string;
}) {
  const t = useTranslations("pm");
  const tStatus = useTranslations("status");
  const tCommon = useTranslations("common");

  const statusText = (status: PmStatus) => {
    const key = PM_STATUS_KEY[status] ?? status;
    return tStatus.has(key) ? tStatus(key) : status;
  };

  // DataTable keys selection off `row.id`, and here the record being opened is
  // the vehicle — so the vehicle id is the row id.
  const tableRows = rows.map((r) => ({ ...r, id: r.vehicleId, scheduleId: r.id }));

  const columns: Column<(typeof tableRows)[number]>[] = [
    {
      key: "vehicle",
      header: t("field.vehicle"),
      sortValue: (r) => r.vehicleCode,
      cell: (r) => (
        <span className="tnum font-medium">
          {r.vehicleCode}
          <span className="ms-2 text-[12px] font-normal text-ink-3">{r.plateNumber}</span>
        </span>
      ),
    },
    {
      key: "part",
      header: t("field.part"),
      sortValue: (r) => r.partName,
      cell: (r) => r.partName,
    },
    {
      key: "interval",
      header: t("field.interval"),
      numeric: true,
      className: "hidden lg:table-cell",
      sortValue: (r) => r.intervalKm,
      cell: (r) => (r.intervalKm === null ? orDash(null) : km(r.intervalKm)),
    },
    {
      key: "lastService",
      header: t("field.lastService"),
      numeric: true,
      className: "hidden md:table-cell",
      sortValue: (r) => r.lastServiceKm,
      cell: (r) => (r.lastServiceKm === null ? orDash(null) : km(r.lastServiceKm)),
    },
    {
      key: "scheduled",
      header: t("field.scheduled"),
      numeric: true,
      className: "hidden sm:table-cell",
      sortValue: (r) => r.scheduledKm,
      cell: (r) => (r.scheduledKm === null ? orDash(null) : km(r.scheduledKm)),
    },
    {
      key: "actual",
      header: t("field.actual"),
      numeric: true,
      className: "hidden lg:table-cell",
      sortValue: (r) => r.actualKm,
      cell: (r) => (r.actualKm === null ? orDash(null) : km(r.actualKm)),
    },
    {
      key: "remaining",
      header: t("field.remaining"),
      numeric: true,
      sortValue: (r) => r.kmRemaining,
      cell: (r) =>
        // Overdue reads as the negative it is; it is never clamped to zero.
        r.kmRemaining === null ? (
          orDash(null)
        ) : (
          <span className={r.kmRemaining < 0 ? "text-stop-text" : ""}>
            {km(r.kmRemaining)}
          </span>
        ),
    },
    {
      key: "status",
      header: t("field.status"),
      sortValue: (r) => r.kmRemaining,
      cell: (r) => <Micro tone={microTone(r.status)}>{statusText(r.status)}</Micro>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={tableRows}
      selectedId={selectedVehicleId}
      pathname="/periodic-maintenance"
      query={query}
      sort={sort}
      dir={dir}
      // Several parts share a vehicle, so the schedule id keys the row while
      // `id` stays the vehicle the drawer opens. Every row of the open vehicle
      // therefore carries the accent bar, which is the point.
      rowKey={(r) => r.scheduleId}
      empty={<Empty title={tCommon("empty")} hint={t("emptyHint")} />}
    />
  );
}
