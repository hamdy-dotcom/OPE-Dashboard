import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteMaster, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { loadVendors } from "./queries";
import { VendorsTable } from "./vendors-table";
import { VendorDrawer } from "./vendor-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

export default async function VendorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    filter?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { q = "", filter = "", id, mode, sort = "", dir = "asc" } = await searchParams;

  const t = await getTranslations("master");
  const user = await requireUser(locale);
  const canEdit = canWriteMaster(user.role);

  const all = await loadVendors(q);

  const rows =
    filter === "kpi"
      ? all.filter((r) => r.applyKpi)
      : filter === "noTerms"
        ? all.filter((r) => r.billingBasis === null)
        : filter === "perBusDay"
          ? all.filter((r) => r.billingBasis === "per_bus_day")
          : filter === "perAvgBusMonth"
            ? all.filter((r) => r.billingBasis === "per_avg_bus_month")
            : all;

  const chips: Chip[] = [
    { value: "", label: t("allRecords"), count: all.length },
    {
      value: "perBusDay",
      label: t("basisPerBusDay"),
      count: all.filter((r) => r.billingBasis === "per_bus_day").length,
    },
    {
      value: "perAvgBusMonth",
      label: t("basisPerAvgBusMonth"),
      count: all.filter((r) => r.billingBasis === "per_avg_bus_month").length,
    },
    {
      value: "kpi",
      label: t("kpiApplies"),
      count: all.filter((r) => r.applyKpi).length,
      tone: "go" as const,
    },
    {
      value: "noTerms",
      label: t("withoutTerms"),
      count: all.filter((r) => r.billingBasis === null).length,
      tone: "warn" as const,
    },
  ];

  const query: Record<string, string> = {};
  if (q) query.q = q;
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
          title={t("vendorsTitle")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/vendors", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newVendor")}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/vendors"
          value={q}
          placeholder={t("searchVendors")}
          extraQuery={filter ? { filter } : {}}
        />

        <FilterChips
          chips={chips}
          active={filter}
          param="filter"
          pathname="/vendors"
          extraQuery={q ? { q } : {}}
        />

        <VendorsTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <VendorDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/vendors", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
