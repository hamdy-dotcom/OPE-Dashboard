import { getTranslations } from "next-intl/server";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { ListSearch } from "@/components/ui/list-search";
import { loadWorkOrders, type WorkOrderStatus } from "./queries";
import { WorkOrdersTable } from "./work-orders-table";
import { WorkOrderDrawer } from "./work-order-drawer";

/**
 * Work orders. There is no New button — an order is always raised from its RFR,
 * which is where the "Create work order" action lives.
 */
export default async function WorkOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    id?: string;
    rfr?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const {
    q = "",
    status = "",
    id,
    rfr,
    mode,
    sort = "",
    dir = "asc",
  } = await searchParams;

  const t = await getTranslations("workOrder");
  const user = await requireUser(locale);
  const canEdit = canWriteOps(user.role);

  const all = await loadWorkOrders(q);
  const rows = status ? all.filter((r) => r.status === status) : all;

  const count = (s: WorkOrderStatus) => all.filter((r) => r.status === s).length;

  const chips: Chip[] = [
    { value: "", label: t("allWorkOrders"), count: all.length },
    { value: "notStarted", label: t("status.notStarted"), count: count("notStarted") },
    {
      value: "inProgress",
      label: t("status.inProgress"),
      count: count("inProgress"),
      tone: "warn",
    },
    {
      value: "completed",
      label: t("status.completed"),
      count: count("completed"),
      tone: "go",
    },
    { value: "skipped", label: t("status.skipped"), count: count("skipped"), tone: "stop" },
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
        <PanelHead title={t("title")} />

        <ListSearch
          pathname="/work-orders"
          value={q}
          placeholder={t("search")}
          extraQuery={status ? { status } : {}}
        />

        <FilterChips
          chips={chips}
          active={status}
          param="status"
          pathname="/work-orders"
          extraQuery={q ? { q } : {}}
        />

        <WorkOrdersTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <WorkOrderDrawer
          mode={drawerMode}
          id={id}
          rfrId={rfr}
          closeHref={{ pathname: "/work-orders", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
