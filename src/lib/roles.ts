/**
 * Role capabilities. Separate from `auth.ts` because the sidebar is a Client
 * Component and `auth.ts` reaches for `next/headers` — importing it from the
 * client would drag server-only code into the browser bundle.
 *
 * These mirror the RLS policies, they never replace them.
 */

export type AppRole = "super_admin" | "admin" | "supervisor" | "data_admin";

export const canWriteOps = (r: AppRole) =>
  r === "super_admin" || r === "supervisor" || r === "data_admin";

export const canWriteMaster = (r: AppRole) =>
  r === "super_admin" || r === "supervisor";

export const canSeeMoney = (r: AppRole) =>
  r === "super_admin" || r === "admin" || r === "supervisor";

export const isSuper = (r: AppRole) => r === "super_admin";
