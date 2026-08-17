import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { loadChargingSessions } from "./queries";
import { PLUG_OPTIONS } from "./plugs";
import { ChargingTable } from "./charging-table";
import { ChargingDrawer } from "./charging-drawer";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

export default async function ChargingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    plugs?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { q = "", plugs = "", id, mode, sort = "", dir = "asc" } = await searchParams;

  const t = await getTranslations("charging");
  const user = await requireUser(locale);
  const canEdit = canWriteOps(user.role);

  const all = await loadChargingSessions(q);
  const rows = plugs ? all.filter((r) => r.plugsUsed === plugs) : all;

  const chips: Chip[] = [
    { value: "", label: t("allSessions"), count: all.length },
    ...PLUG_OPTIONS.map((plug) => ({
      value: plug,
      label: t("plugLabel", { plug }),
      count: all.filter((r) => r.plugsUsed === plug).length,
    })),
    {
      value: "open",
      label: t("openSessions"),
      count: all.filter((r) => r.endTime === null).length,
      tone: "warn" as const,
    },
  ];

  const visible = plugs === "open" ? all.filter((r) => r.endTime === null) : rows;

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (plugs) query.plugs = plugs;
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
                href={{ pathname: "/charging", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("new")}
              </Link>
            ) : undefined
          }
        />

        <ListSearch
          pathname="/charging"
          value={q}
          placeholder={t("search")}
          extraQuery={plugs ? { plugs } : {}}
        />

        <FilterChips
          chips={chips}
          active={plugs}
          param="plugs"
          pathname="/charging"
          extraQuery={q ? { q } : {}}
        />

        <ChargingTable
          rows={visible}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <ChargingDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/charging", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
