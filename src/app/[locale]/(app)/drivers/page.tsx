import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteMaster, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { expiryState } from "@/lib/format";
import { loadDrivers, type DriverRow } from "./queries";
import { DriversTable } from "./drivers-table";
import { DriverDrawer } from "./driver-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/** Amber or red on either document. */
const documentsDue = (r: DriverRow) => {
  const licence = expiryState(r.licenseExpiryDate);
  const tourism = r.hasTourismId ? expiryState(r.tourismIdExpiryDate) : "ok";
  return (
    licence === "expired" ||
    licence === "expiring" ||
    tourism === "expired" ||
    tourism === "expiring"
  );
};

export default async function DriversPage({
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

  const all = await loadDrivers(q);

  const rows =
    filter === "due"
      ? all.filter(documentsDue)
      : filter === "company"
        ? all.filter((r) => r.vendorId === null)
        : filter
          ? all.filter((r) => r.statusCode === filter)
          : all;

  const statusCodes = [...new Set(all.map((r) => r.statusCode).filter(Boolean))];
  const chips: Chip[] = [
    { value: "", label: t("allRecords"), count: all.length },
    ...statusCodes.map((code) => ({
      value: code as string,
      label: all.find((r) => r.statusCode === code)?.statusLabel ?? (code as string),
      count: all.filter((r) => r.statusCode === code).length,
      tone: code === "active" ? ("go" as const) : ("neutral" as const),
    })),
    {
      value: "company",
      label: t("companyDriver"),
      count: all.filter((r) => r.vendorId === null).length,
    },
    {
      value: "due",
      label: t("documentsDue"),
      count: all.filter(documentsDue).length,
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
          title={t("driversTitle")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/drivers", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newDriver")}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/drivers"
          value={q}
          placeholder={t("searchDrivers")}
          extraQuery={filter ? { filter } : {}}
        />

        <FilterChips
          chips={chips}
          active={filter}
          param="filter"
          pathname="/drivers"
          extraQuery={q ? { q } : {}}
        />

        <DriversTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <DriverDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/drivers", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
