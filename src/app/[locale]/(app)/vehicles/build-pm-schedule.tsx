"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { buildPmSchedule } from "./actions";

/**
 * Seeds the vehicle's PM schedule. Only rendered when the vehicle has no
 * schedule rows yet — fn_init_pm_schedules is idempotent, but an always-on
 * button would suggest there is something to do when there isn't.
 */
export function BuildPmSchedule({ vehicleId }: { vehicleId: string }) {
  const t = useTranslations("master");
  const [state, formAction, pending] = useActionState(
    buildPmSchedule.bind(null, vehicleId),
    EMPTY_FORM_STATE,
  );

  return (
    <form action={formAction} className="grid justify-items-start gap-2">
      <Button type="submit" disabled={pending}>
        {pending ? t("buildingPmSchedule") : t("buildPmSchedule")}
      </Button>
      {state.formError && (
        <p role="alert" className="text-[12px] text-stop-text">
          {t(`error.${state.formError}`)}
        </p>
      )}
    </form>
  );
}
