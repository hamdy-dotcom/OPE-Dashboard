import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteMaster, requireUser } from "@/lib/auth";
import { Drawer } from "@/components/ui/drawer";
import { Panel, PanelHead, Section } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { VehicleDrawer } from "../vehicles/vehicle-drawer";
import { loadPmBoard, loadVehiclesWithoutSchedule } from "./queries";
import { PmTable } from "./pm-table";
import { BuildSchedules } from "./build-schedules";

const buildButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/**
 * Periodic maintenance. The one place where a row is not the record the drawer
 * shows: rows are vehicle-part schedules sorted by urgency, but selecting one
 * opens that vehicle's drawer with its whole schedule.
 */
export default async function PeriodicMaintenancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { q = "", status = "", id, mode, sort = "", dir = "asc" } = await searchParams;

  const t = await getTranslations("pm");
  const tStatus = await getTranslations("status");
  const tCommon = await getTranslations("common");
  const user = await requireUser(locale);
  const canEdit = canWriteMaster(user.role);

  const all = await loadPmBoard(q);
  const rows = status ? all.filter((r) => r.status === status) : all;

  const count = (code: string) => all.filter((r) => r.status === code).length;

  const chips: Chip[] = [
    { value: "", label: t("allParts"), count: all.length },
    { value: "overdue", label: tStatus("overdue"), count: count("overdue"), tone: "stop" },
    { value: "due_now", label: tStatus("dueNow"), count: count("due_now"), tone: "warn" },
    { value: "due_soon", label: tStatus("dueSoon"), count: count("due_soon"), tone: "warn" },
    { value: "ok", label: tStatus("ok"), count: count("ok"), tone: "go" },
  ];

  // Only shown when they exist, so no row is unreachable by any chip.
  if (count("never_serviced") > 0) {
    chips.push({
      value: "never_serviced",
      label: tStatus("neverServiced"),
      count: count("never_serviced"),
    });
  }
  if (count("no_km_data") > 0) {
    chips.push({
      value: "no_km_data",
      label: tStatus("noKmData"),
      count: count("no_km_data"),
    });
  }

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (sort) {
    query.sort = sort;
    query.dir = dir;
  }

  const drawerMode =
    canEdit && mode === "edit" && id ? "edit" : id ? "view" : null;

  // Always offered to supervisor and above, not only when the board is empty:
  // buses join the fleet after the first seeding too.
  const building = canEdit && mode === "build";
  const seedable = building ? await loadVehiclesWithoutSchedule() : [];

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={t("title")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/periodic-maintenance", query: { mode: "build" } }}
                className={buildButton}
              >
                {t("buildSchedules")}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/periodic-maintenance"
          value={q}
          placeholder={t("search")}
          extraQuery={status ? { status } : {}}
        />

        <FilterChips
          chips={chips}
          active={status}
          param="status"
          pathname="/periodic-maintenance"
          extraQuery={q ? { q } : {}}
        />

        <PmTable
          rows={rows}
          selectedVehicleId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {building && (
        <Drawer
          code={t("buildSchedules")}
          sub={t("buildSchedulesSub")}
          closeHref={{ pathname: "/periodic-maintenance", query }}
          closeLabel={tCommon("cancel")}
        >
          <Section title={t("vehiclesWithoutSchedule")}>
            <BuildSchedules vehicles={seedable} />
          </Section>
        </Drawer>
      )}

      {!building && drawerMode && (
        <VehicleDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/periodic-maintenance", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
