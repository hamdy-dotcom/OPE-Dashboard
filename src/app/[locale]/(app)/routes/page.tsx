import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteMaster, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { loadRoutes, loadStations, type RouteEntity } from "./queries";
import { RoutesTable, StationsTable } from "./routes-table";
import { RouteDrawer } from "./route-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/**
 * Routes and stations on one page. The chips switch which of the two the table
 * lists; the drawer follows whichever record is open.
 */
export default async function RoutesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    entity?: string;
    q?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    entity: entityParam,
    q = "",
    id,
    mode,
    sort = "",
    dir = "asc",
  } = await searchParams;

  const entity: RouteEntity = entityParam === "stations" ? "stations" : "routes";
  const isStations = entity === "stations";

  const t = await getTranslations("master");
  const user = await requireUser(locale);
  const canEdit = canWriteMaster(user.role);

  // Both sides are counted so the chips are accurate whichever is showing.
  const [routes, stations] = await Promise.all([loadRoutes(q), loadStations(q)]);

  const chips: Chip[] = [
    { value: "", label: t("routesTab"), count: routes.length },
    { value: "stations", label: t("stationsTab"), count: stations.length },
  ];

  const query: Record<string, string> = {};
  if (isStations) query.entity = "stations";
  if (q) query.q = q;
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

  const newLabel = isStations ? t("newStation") : t("newRoute");

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={isStations ? t("stationsTitle") : t("routesTitle")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/routes", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {newLabel}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/routes"
          value={q}
          placeholder={isStations ? t("searchStations") : t("searchRoutes")}
          extraQuery={isStations ? { entity: "stations" } : {}}
        />

        <FilterChips
          chips={chips}
          active={isStations ? "stations" : ""}
          param="entity"
          pathname="/routes"
          extraQuery={q ? { q } : {}}
        />

        {isStations ? (
          <StationsTable
            rows={stations}
            selectedId={id ?? null}
            query={query}
            sort={sort}
            dir={dir}
          />
        ) : (
          <RoutesTable
            rows={routes}
            selectedId={id ?? null}
            query={query}
            sort={sort}
            dir={dir}
          />
        )}
      </Panel>

      {drawerMode && (
        <RouteDrawer
          entity={entity}
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/routes", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
