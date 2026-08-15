import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { Panel, Section } from "@/components/ui/panel";
import { KeyValue, Row } from "@/components/ui/key-value";
import { KmMeter } from "@/components/ui/km-meter";
import { Micro } from "@/components/ui/micro";
import { Pill } from "@/components/ui/pill";
import { Empty } from "@/components/ui/empty";
import { km, money, percent, pmTone } from "@/lib/format";
import { loadNearestPm, type OperationRow, type ShiftOption } from "./queries";

/** The signature KM meter wants a 0–100 bar; the view gives it in kilometres. */
function pmProgress(intervalKm: number | null, kmRemaining: number | null) {
  if (intervalKm === null || intervalKm <= 0 || kmRemaining === null) return null;
  return ((intervalKm - kmRemaining) / intervalKm) * 100;
}

/** The meter bar only carries approaching-limit and breached. */
const barTone = (t: ReturnType<typeof pmTone> | null) =>
  t === "stop" ? "stop" : t === "warn" ? "warn" : "neutral";

const labelTone = (t: ReturnType<typeof pmTone> | null) =>
  t === null || t === "idle" ? "neutral" : t;

/** v_periodic_maintenance statuses map onto the shared `status.*` messages. */
const PM_STATUS_KEY: Record<string, string> = {
  overdue: "overdue",
  due_now: "dueNow",
  due_soon: "dueSoon",
  never_serviced: "neverServiced",
  no_km_data: "noKmData",
  ok: "ok",
};

export async function OperationDetail({
  operation,
  shifts,
  canEdit,
  backTo,
}: {
  operation: OperationRow | null;
  shifts: ShiftOption[];
  canEdit: boolean;
  backTo: Record<string, string>;
}) {
  const t = await getTranslations("operations");
  const tCommon = await getTranslations("common");
  const tVehicle = await getTranslations("vehicle");
  const tShift = await getTranslations("shift");
  const tStatus = await getTranslations("status");

  if (!operation) {
    return (
      <Panel>
        <Empty title={t("noSelection")} hint={t("noSelectionHint")} />
      </Panel>
    );
  }

  const shift = shifts.find((s) => s.id === operation.shiftId);
  const shiftLabel = shift
    ? tShift.has(shift.code)
      ? tShift(shift.code)
      : shift.labelEn
    : "—";

  const noEnd = operation.endKm === null;
  const pm = operation.vehicleId ? await loadNearestPm(operation.vehicleId) : null;
  const tone = pm ? pmTone(pm.status) : null;

  return (
    <Panel>
      <header className="px-4 pb-3.5 pt-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="tnum text-2xl font-semibold tracking-[-0.02em]">
            {operation.vehicleCode}
          </span>
          <Pill tone={noEnd ? "warn" : "go"}>
            {noEnd ? tStatus("noEndKm") : tStatus("operating")}
          </Pill>
          {canEdit && (
            <Link
              href={{ pathname: `/operations/${operation.id}/edit`, query: backTo }}
              className="ms-auto rounded-[10px] border border-hairline bg-surface px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-raise"
            >
              {tCommon("edit")}
            </Link>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] text-ink-3">
          {operation.plate} · {operation.code}
        </p>
      </header>

      <Section title={tVehicle("odometer")}>
        <KmMeter
          startKm={operation.startKm}
          endKm={operation.endKm}
          large
          pmProgress={pm ? pmProgress(pm.intervalKm, pm.kmRemaining) : null}
          pmTone={barTone(tone)}
          pmLabel={
            pm
              ? t("pmLabel", { part: pm.partName, km: km(pm.kmRemaining) })
              : undefined
          }
        />
        {pm && (
          <div className="mt-2.5">
            <Micro tone={labelTone(tone)}>
              {tStatus.has(PM_STATUS_KEY[pm.status] ?? pm.status)
                ? tStatus(PM_STATUS_KEY[pm.status] ?? pm.status)
                : pm.status}
            </Micro>
          </div>
        )}
      </Section>

      <Section title={t("record")}>
        <KeyValue>
          <Row label={t("field.date")}>
            <span className="tnum">{operation.date}</span>
          </Row>
          <Row label={t("field.shift")}>{shiftLabel}</Row>
          <Row label={tVehicle("vendor")} muted>
            {operation.vendorName ?? "—"}
          </Row>
          <Row label={t("field.driver")}>
            {operation.driverName ?? "—"}
            {operation.driverCode && (
              <span className="ms-2 text-[12px] text-ink-3">{operation.driverCode}</span>
            )}
          </Row>
          <Row label={t("field.route")} muted>
            {operation.routeName ?? tCommon("none")}
          </Row>
          <Row label={t("field.startingKm")}>
            <span className="tnum">{km(operation.startKm)}</span>
          </Row>
          <Row label={t("field.endingKm")}>
            {operation.endKm === null ? (
              <span className="text-warn-text">{tStatus("noEndKm")}</span>
            ) : (
              <span className="tnum">{km(operation.endKm)}</span>
            )}
          </Row>
          <Row label={t("field.battery")} muted>
            {operation.batteryStart !== null && operation.batteryEnd !== null
              ? t("battery", {
                  from: operation.batteryStart,
                  to: operation.batteryEnd,
                })
              : "—"}
          </Row>
          <Row label={t("field.operatingPct")}>{percent(operation.operatingPct)}</Row>
          <Row label={t("field.driverTips")} muted>
            {money(operation.driverTips)}
          </Row>
        </KeyValue>
      </Section>

      {operation.remarks && (
        <Section title={t("field.remarks")}>
          <p className="text-[13px] leading-relaxed text-ink-2">{operation.remarks}</p>
        </Section>
      )}
    </Panel>
  );
}
