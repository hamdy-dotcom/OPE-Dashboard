import type { Tone } from "@/components/ui/pill";
import type { StageState } from "@/components/ui/stage-rail";

/**
 * Colour is information: green for a finished request, red for a dropped one,
 * amber while it waits to be accepted, neutral for everything in between.
 */
export function stagePillTone(code: string | null): Tone {
  switch (code) {
    case "completed":
      return "go";
    case "skipped":
      return "stop";
    case "pending":
      return "warn";
    default:
      return "idle";
  }
}

/** The stages that mean "deferred or dropped" rather than "progressed". */
export const isSkipStage = (code: string) => code.startsWith("skipped");

export function railState(
  code: string,
  isCurrent: boolean,
  visited: boolean,
): StageState {
  if (isCurrent) return "now";
  if (!visited) return "todo";
  return isSkipStage(code) ? "skip" : "done";
}
