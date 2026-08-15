import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/routing";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { Stat, StatBar } from "@/components/ui/stat";
import { Empty } from "@/components/ui/empty";
import { loadOperation, loadOperations, loadShifts } from "./queries";
import { OperationsFilters } from "./operations-filters";
import { OperationsList } from "./operations-list";
import { OperationDetail } from "./operation-detail";

/**
 * Daily operations list. Same shape as the day board: a Server Component
 * fetches, a small client list handles selection, the detail panel renders
 * beside it. Filters and selection both live in the URL.
 */
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; shift?: string; selected?: string }>;
}) {
  const { locale } = await params;
  const { date = "", shift = "", selected } = await searchParams;

  const t = await getTranslations("operations");
  const tCommon = await getTranslations("common");
  const user = await requireUser(locale);
  const canEdit = canWriteOps(user.role);

  const shifts = await loadShifts();
  const shiftId = shifts.find((s) => s.code === shift)?.id;

  const rows = await loadOperations({
    date: date || undefined,
    shiftId,
  });

  // The selected row may sit outside the current filter, so it is fetched
  // rather than looked up in `rows`.
  const selectedId = selected ?? rows[0]?.id ?? null;
  const operation = selectedId ? await loadOperation(selectedId) : null;

  const query: Record<string, string> = {};
  if (date) query.date = date;
  if (shift) query.shift = shift;

  const missingEndKm = rows.filter((r) => r.endKm === null).length;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Panel>
        <PanelHead
          title={t("title")}
          actions={
            canEdit ? (
              <Link
                href={{ pathname: "/operations/new", query }}
                className="rounded-[10px] border border-ink bg-ink px-3 py-1.5 text-[12.5px] font-medium text-on-ink transition-opacity hover:opacity-90"
              >
                {t("new")}
              </Link>
            ) : undefined
          }
        />

        <OperationsFilters shifts={shifts} date={date} shift={shift} today={today} />

        <StatBar>
          <Stat label={t("records")} value={rows.length} />
          <Stat
            label={t("missingEndKm")}
            value={missingEndKm}
            tone={missingEndKm > 0 ? "warn" : "neutral"}
          />
        </StatBar>

        {rows.length === 0 ? (
          <Empty title={tCommon("empty")} hint={tCommon("emptyHint")} />
        ) : (
          <OperationsList
            rows={rows}
            shifts={shifts}
            selectedId={selectedId}
            query={query}
          />
        )}
      </Panel>

      <OperationDetail
        operation={operation}
        shifts={shifts}
        canEdit={canEdit}
        backTo={selectedId ? { ...query, selected: selectedId } : query}
      />
    </>
  );
}
