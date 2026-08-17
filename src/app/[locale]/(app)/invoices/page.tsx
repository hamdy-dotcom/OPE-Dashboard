import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { canSeeMoney, isSuper, requireUser } from "@/lib/auth";
import { Panel, PanelHead } from "@/components/ui/panel";
import { FilterChips, type Chip } from "@/components/ui/filter-chips";
import { loadInvoices, loadInvoiceVendors, type InvoiceStatus } from "./queries";
import { InvoicesTable } from "./invoices-table";
import { InvoiceDrawer } from "./invoice-drawer";
import { GenerateInvoice } from "./generate-invoice";

/**
 * Vendor invoices. `super_admin` writes; admin and supervisor read.
 * `data_admin` has no finance access at all and never reaches this page.
 */
export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    status?: string;
    id?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { locale } = await params;
  const { status = "", id, sort = "", dir = "asc" } = await searchParams;

  const user = await requireUser(locale);
  if (!canSeeMoney(user.role)) notFound();

  const t = await getTranslations("invoice");
  const canEdit = isSuper(user.role);

  const [all, vendors] = await Promise.all([loadInvoices(), loadInvoiceVendors()]);
  const rows = status ? all.filter((r) => r.status === status) : all;

  const count = (s: InvoiceStatus) => all.filter((r) => r.status === s).length;

  const chips: Chip[] = [
    { value: "", label: t("allInvoices"), count: all.length },
    { value: "draft", label: t("status.draft"), count: count("draft") },
    {
      value: "submitted",
      label: t("status.submitted"),
      count: count("submitted"),
      tone: "warn",
    },
    {
      value: "approved",
      label: t("status.approved"),
      count: count("approved"),
      tone: "go",
    },
    { value: "paid", label: t("status.paid"), count: count("paid"), tone: "go" },
  ];

  const query: Record<string, string> = {};
  if (status) query.status = status;
  if (sort) {
    query.sort = sort;
    query.dir = dir;
  }

  return (
    <>
      <Panel clip={false}>
        <PanelHead
          title={t("title")}
          actions={canEdit ? <GenerateInvoice vendors={vendors} /> : undefined}
        />

        <FilterChips
          chips={chips}
          active={status}
          param="status"
          pathname="/invoices"
        />

        <InvoicesTable
          rows={rows}
          selectedId={id ?? null}
          query={query}
          sort={sort}
          dir={dir}
        />
      </Panel>

      {id && (
        <InvoiceDrawer
          id={id}
          closeHref={{ pathname: "/invoices", query }}
          canEdit={canEdit}
        />
      )}
    </>
  );
}
