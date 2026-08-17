"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { setScorecardStatus } from "./actions";
import type { ScorecardStatus } from "./queries";

/** Approve a scorecard, or reopen one that was approved. */
export function StatusActions({
  scorecardId,
  status,
}: {
  scorecardId: string;
  status: ScorecardStatus;
}) {
  const t = useTranslations("scorecard");
  const [state, formAction, pending] = useActionState(
    setScorecardStatus.bind(null, scorecardId),
    EMPTY_FORM_STATE,
  );

  const approved = status === "approved";

  return (
    <form action={formAction} className="grid justify-items-start gap-2">
      <input type="hidden" name="status" value={approved ? "reopened" : "approved"} />
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
