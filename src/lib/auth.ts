import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "super_admin" | "admin" | "supervisor" | "data_admin";

export type CurrentUser = {
  id: string;
  email: string | null;
  fullName: string;
  jobTitle: string | null;
  isEngineer: boolean;
  role: AppRole;
};

/** Current signed-in user with profile. Redirects to login when absent. */
export async function requireUser(locale: string): Promise<CurrentUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, job_title, is_engineer, role, is_active")
    .eq("id", user.id)
    .single<{
      full_name: string;
      job_title: string | null;
      is_engineer: boolean;
      role: AppRole;
      is_active: boolean;
    }>();

  if (!profile || !profile.is_active) redirect(`/${locale}/login?error=inactive`);

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile.full_name,
    jobTitle: profile.job_title,
    isEngineer: profile.is_engineer,
    role: profile.role,
  };
}

/* --- capability helpers. Mirror the RLS policies, never replace them. --- */

export const canWriteOps = (r: AppRole) =>
  r === "super_admin" || r === "supervisor" || r === "data_admin";

export const canWriteMaster = (r: AppRole) =>
  r === "super_admin" || r === "supervisor";

export const canSeeMoney = (r: AppRole) =>
  r === "super_admin" || r === "admin" || r === "supervisor";

export const isSuper = (r: AppRole) => r === "super_admin";
