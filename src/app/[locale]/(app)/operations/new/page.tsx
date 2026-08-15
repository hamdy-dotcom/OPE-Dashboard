import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { canWriteOps, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { loadPickerOptions, type OperationFormValues } from "../queries";
import { OperationForm } from "../operation-form";

/** Full-width on desktop, full-screen on a phone — one field per row either way. */
export default async function NewOperationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string; shift?: string; selected?: string }>;
}) {
  const { locale } = await params;
  const { date, shift, selected } = await searchParams;

  const user = await requireUser(locale);
  if (!canWriteOps(user.role)) notFound();

  const t = await getTranslations("operations");
  const options = await loadPickerOptions();

  const today = new Date().toISOString().slice(0, 10);
  const shiftFromFilter = options.shifts.find((s) => s.code === shift);

  const initial: OperationFormValues = {
    operationDate: date || today,
    shiftTypeId: shiftFromFilter?.id ?? "",
    vehicleId: "",
    driverId: "",
    routeId: "",
    startingKm: "",
    endingKm: "",
    operatingPct: "",
    startingBatteryPct: "",
    endingBatteryPct: "",
    driverTips: "",
    remarks: "",
  };

  const backTo: Record<string, string> = {};
  if (date) backTo.date = date;
  if (shift) backTo.shift = shift;
  if (selected) backTo.selected = selected;

  return (
    <Panel className="xl:col-span-2">
      <PanelHead title={t("new")} />
      <OperationForm mode="create" options={options} initial={initial} backTo={backTo} />
    </Panel>
  );
}
