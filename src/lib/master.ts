import { getLocale } from "next-intl/server";
import { canWriteMaster, requireUser } from "@/lib/auth";
import type { FormState } from "@/lib/forms";

/**
 * Master data is supervisor-and-above. `data_admin` reads it but never writes,
 * so every master Server Action starts here — hiding the button is not the
 * check, this is (and RLS is the real one underneath).
 */
export type MasterGuard = { locale: string } | FormState;

export const isDenied = (g: MasterGuard): g is FormState => "formError" in g;

export async function guardMaster(): Promise<MasterGuard> {
  const locale = await getLocale();
  const user = await requireUser(locale);

  if (!canWriteMaster(user.role)) {
    return { formError: "forbidden", fieldErrors: {} };
  }
  return { locale };
}
