import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { loadOperations, loadShifts } from "./queries";
import { OperationsTable } from "./operations-table";
import { OperationDrawer } from "./operation-drawer";
import { DateFilter } from "./date-filter";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/**
 * Daily operations. One dense table across the content region; the drawer
 * overlays it from the inline-end edge for viewing, creating and editing.
 */
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    date?: string;
    filter?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { date = "", filter = "", id, mode, sort = "", dir = "asc" } = await searchParams;

  const t = await getTranslations("operations");
  const tShift = await getTranslations("shift");
  const user = await requireUser(locale);
  const canEdit = canWriteOps(user.role);

  const shifts = await loadShifts();

  // Fetched unfiltered so the chips can carry real counts, then narrowed here
  // for display. One `filter` param covers both the shifts and the missing-end
  // -KM view, so every chip is a real filter rather than a bare count.
  const all = await loadOperations({ date: date || undefined });
  const rows =
    filter === "missing"
      ? all.filter((r) => r.endKm === null)
      : filter
        ? all.filter((r) => r.shiftId === shifts.find((s) => s.code === filter)?.id)
        : all;

  const chips: Chip[] = [
    { value: "", label: t("allShifts"), count: all.length },
    ...shifts.map((s) => ({
      value: s.code,
      label: tShift.has(s.code) ? tShift(s.code) : s.labelEn,
      count: all.filter((r) => r.shiftId === s.id).length,
    })),
    {
      value: "missing",
      label: t("missingEndKm"),
      count: all.filter((r) => r.endKm === null).length,
      tone: "warn" as const,
    },
  ];

  const query: Record<string, string> = {};
  if (date) query.date = date;
  if (filter) query.filter = filter;
  if (sort) {
    query.sort = sort;
    query.dir = dir;
  }

  const drawerMode =
    canEdit && mode === "new"
      ? "new"
      : canEdit && mode === "edit" && id
        ? "edit"
        : id
          ? "view"
          : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={t("title")}
          actions={
            <div className="flex flex-wrap items-center gap-3.5">
              <DateFilter date={date} today={today} filter={filter} />
              {canEdit && (
                <Link
                  href={{ pathname: "/operations", query: { ...query, mode: "new" } }}
                  className={newButton}
                >
                  {t("new")}
                </Link>
              )}
            </div>
          }
        />

        <FilterChips
          chips={chips}
          active={filter}
          param="filter"
          pathname="/operations"
          extraQuery={date ? { date } : {}}
        />

        <OperationsTable
          rows={rows}
          shifts={shifts}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <OperationDrawer
          mode={drawerMode}
          id={id}
          shifts={shifts}
          closeHref={{ pathname: "/operations", query }}
          canEdit={canEdit}
          filterDate={date}
          filterShift={filter}
        />
      )}
    </>
  );
}
