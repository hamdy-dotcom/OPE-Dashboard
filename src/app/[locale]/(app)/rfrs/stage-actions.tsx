"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, SelectInput } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import type { LookupOption } from "@/lib/lookups";
import { changeStage } from "./actions";

/**
 * Moves the RFR to another stage. One action, one write to rfrs.stage_id —
 * rfr_stage_history is the trigger's business, and the access-time clock
 * follows from it.
 */
export function StageActions({
  rfrId,
  stages,
  skipReasons,
  currentStageId,
}: {
  rfrId: string;
  stages: LookupOption[];
  skipReasons: LookupOption[];
  currentStageId: string;
}) {
  const t = useTranslations("rfr");
  const [state, formAction, pending] = useActionState(
    changeStage.bind(null, rfrId),
    EMPTY_FORM_STATE,
  );

  const [stageId, setStageId] = useState(currentStageId);
  const [skipReasonId, setSkipReasonId] = useState("");

  const target = stages.find((s) => s.id === stageId);
  const needsReason = target?.code === "skipped";

  const err = (field: string) => {
    const key = state.fieldErrors[field];
    return key ? t(`error.${key}`) : undefined;
  };

  return (
    <form action={formAction} className="grid gap-3">
      <Field label={t("changeStage")} htmlFor="stageId" error={err("stageId")}>
        <SelectInput
          id="stageId"
          name="stageId"
          value={stageId}
          onChange={(e) => setStageId(e.target.value)}
        >
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.labelEn}
            </option>
          ))}
        </SelectInput>
      </Field>

      {needsReason && (
        <Field
          label={t("skipReason")}
          htmlFor="skipReasonId"
          error={err("skipReasonId")}
        >
          <SelectInput
            id="skipReasonId"
            name="skipReasonId"
            value={skipReasonId}
            onChange={(e) => setSkipReasonId(e.target.value)}
          >
            <option value="">{t("chooseSkipReason")}</option>
            {skipReasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.labelEn}
              </option>
            ))}
          </SelectInput>
        </Field>
      )}

      {state.formError && (
        <p role="alert" className="text-[12px] text-stop-text">
          {t(`error.${state.formError}`)}
        </p>
      )}

      <div>
        <Button
          type="submit"
          variant={needsReason ? "danger" : "default"}
          disabled={pending || stageId === currentStageId}
        >
          {needsReason ? t("skipRequest") : t("applyStage")}
        </Button>
      </div>
    </form>
  );
}
