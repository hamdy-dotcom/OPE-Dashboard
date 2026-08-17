import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/lib/i18n/routing";
import { canSeeMoney, isSuper, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { loadScorecards, loadVendorsWithTemplates } from "./queries";
import { ScorecardsTable } from "./scorecards-table";
import { ScorecardDrawer } from "./scorecard-drawer";
import { OpenMonth } from "./open-month";

const newButton =
  "rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90";

/**
 * Vendor scorecards. Templates and monthly snapshots are separate lists —
 * a template is the vendor's editable KPI set, a month is a frozen copy of it.
 *
 * `super_admin` writes; admin and supervisor read. `data_admin` has no finance
 * access at all and never reaches this page.
 */
export default async function ScorecardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    kind?: string;
    id?: string;
    mode?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { kind: kindParam, id, mode, sort = "", dir = "asc" } = await searchParams;

  const user = await requireUser(locale);
  if (!canSeeMoney(user.role)) notFound();

  const t = await getTranslations("scorecard");
  const canEdit = isSuper(user.role);

  const kind = kindParam === "templates" ? "templates" : "months";

  const [months, templates, vendorInfo] = await Promise.all([
    loadScorecards("months"),
    loadScorecards("templates"),
    loadVendorsWithTemplates(),
  ]);

  const rows = kind === "templates" ? templates : months;

  const chips: Chip[] = [
    { value: "", label: t("monthsTab"), count: months.length },
    { value: "templates", label: t("templatesTab"), count: templates.length },
  ];

  // Only vendors without one can take a new template — the partial unique
  // index allows a single template per vendor.
  const vendorsWithoutTemplate = vendorInfo.vendors.filter(
    (v) => !vendorInfo.withTemplate.includes(v.id),
  );

  const drawerMode = canEdit && mode === "new" ? "new" : id ? "view" : null;

  const query: Record<string, string> = {};
  if (kind === "templates") query.kind = "templates";
  if (sort) {
    query.sort = sort;
    query.dir = dir;
  }

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={kind === "templates" ? t("templatesTitle") : t("title")}
          actions={
            !canEdit ? undefined : kind === "templates" ? (
              <Link
                href={{ pathname: "/scorecards", query: { ...query, mode: "new" } }}
                className={newButton}
              >
                {t("newTemplate")}
              </Link>
            ) : (
              <OpenMonth
                vendors={vendorInfo.vendors}
                withTemplate={vendorInfo.withTemplate}
              />
            )
          }
        />

        <FilterChips
          chips={chips}
          active={kind === "templates" ? "templates" : ""}
          param="kind"
          pathname="/scorecards"
        />

        <ScorecardsTable
          rows={rows}
          kind={kind}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {drawerMode && (
        <ScorecardDrawer
          mode={drawerMode}
          id={id}
          closeHref={{ pathname: "/scorecards", query }}
          canEdit={canEdit}
          vendorsWithoutTemplate={vendorsWithoutTemplate}
        />
      )}
    </>
  );
}
