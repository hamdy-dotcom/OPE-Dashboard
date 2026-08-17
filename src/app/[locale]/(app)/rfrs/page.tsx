import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { loadRfrs, loadStages } from "./queries";
import { RfrsTable } from "./rfrs-table";
import { RfrDrawer } from "./rfr-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

export default async function RfrsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    filter?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { filter = "", id, mode, sort = "", dir = "asc" } = await searchParams;

  const t = await getTranslations("rfr");
  const user = await requireUser(locale);
  const canEdit = canWriteOps(user.role);

  // Fetched unfiltered so the stage chips carry real counts.
  const [stages, all] = await Promise.all([loadStages(), loadRfrs("")]);
  const rows =
    filter === "running"
      ? all.filter((r) => r.clockRunning)
      : filter
        ? all.filter((r) => r.stageCode === filter)
        : all;

  const chips: Chip[] = [
    { value: "", label: t("allStages"), count: all.length },
    ...stages.map((s) => ({
      value: s.code,
      label: s.labelEn,
      count: all.filter((r) => r.stageCode === s.code).length,
      tone:
        s.code === "completed"
          ? ("go" as const)
          : s.code === "skipped"
            ? ("stop" as const)
            : s.code === "pending"
              ? ("warn" as const)
              : ("neutral" as const),
    })),
  ];

  chips.push({
    value: "running",
    label: t("clockRunning"),
    count: all.filter((r) => r.clockRunning).length,
    tone: "stop",
  });

  const query: Record<string, string> = {};
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

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={t("title")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/rfrs", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newRfr")}
              </Link>
            ) : undefined
          }
        />

        <FilterChips chips={chips} active={filter} param="filter" pathname="/rfrs" />

        <RfrsTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <RfrDrawer
          mode={drawerMode}
          id={id}
          stages={stages}
          closeHref={{ pathname: "/rfrs", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
