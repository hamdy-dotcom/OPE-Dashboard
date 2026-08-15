import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { loadOperation, loadPickerOptions, toFormValues } from "../../queries";
import { OperationForm } from "../../operation-form";

export default async function EditOperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ date?: string; shift?: string; selected?: string }>;
}) {
  const { locale, id } = await params;
  const { date, shift } = await searchParams;

  const user = await requireUser(locale);
  if (!canWriteOps(user.role)) notFound();

  const t = await getTranslations("operations");
  const [operation, options] = await Promise.all([
    loadOperation(id),
    loadPickerOptions(),
  ]);

  if (!operation) notFound();

  const backTo: Record<string, string> = { selected: id };
  if (date) backTo.date = date;
  if (shift) backTo.shift = shift;

  return (
    <Panel className="xl:col-span-2">
      <PanelHead
        title={`${t("edit")} · ${operation.vehicleCode}`}
        actions={<span className="tnum">{operation.code}</span>}
      />
      <OperationForm
        mode="edit"
        operationId={id}
        options={options}
        initial={toFormValues(operation)}
        backTo={backTo}
      />
    </Panel>
  );
}
