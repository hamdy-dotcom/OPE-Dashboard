import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteMaster, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { loadVehicles } from "./queries";
import { VehiclesTable } from "./vehicles-table";
import { VehicleDrawer } from "./vehicle-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

export default async function VehiclesPage({
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

  const t = await getTranslations("master");
  const user = await requireUser(locale);
  const canEdit = canWriteMaster(user.role);

  // Loaded unfiltered by status so the chips carry real counts.
  const all = await loadVehicles(q);
  const rows = status ? all.filter((r) => r.statusCode === status) : all;

  const statusCodes = [...new Set(all.map((r) => r.statusCode).filter(Boolean))];
  const chips: Chip[] = [
    { value: "", label: t("allRecords"), count: all.length },
    ...statusCodes.map((code) => ({
      value: code as string,
      label: all.find((r) => r.statusCode === code)?.statusLabel ?? (code as string),
      count: all.filter((r) => r.statusCode === code).length,
      tone: code === "active" ? ("go" as const) : ("neutral" as const),
    })),
  ];

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
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
          title={t("vehiclesTitle")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/vehicles", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newVehicle")}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/vehicles"
          value={q}
          placeholder={t("searchVehicles")}
          extraQuery={status ? { status } : {}}
        />

        <FilterChips
          chips={chips}
          active={status}
          param="status"
          pathname="/vehicles"
          extraQuery={q ? { q } : {}}
        />

        <VehiclesTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <VehicleDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/vehicles", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
