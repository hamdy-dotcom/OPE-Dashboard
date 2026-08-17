"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { setInvoiceStatus } from "./actions";
import type { InvoiceStatus } from "./queries";

/** Approve an invoice, or send an approved one back to draft. */
export function InvoiceStatusActions({
  invoiceId,
  status,
}: {
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const t = useTranslations("invoice");
  const [state, formAction, pending] = useActionState(
    setInvoiceStatus.bind(null, invoiceId),
    EMPTY_FORM_STATE,
  );

  const approved = status === "approved" || status === "paid";

  return (
    <form action={formAction} className="grid justify-items-start gap-2">
      <input type="hidden" name="status" value={approved ? "draft" : "approved"} />
      <Button type="submit" variant={approved ? "default" : "primary"} disabled={pending}>
        {approved ? t("reopen") : t("approve")}
      </Button>
      {state.formError && (
        <p role="alert" className="text-[12px] text-stop-text">
          {t(`error.${state.formError}`)}
        </p>
      )}
    </form>
  );
}
