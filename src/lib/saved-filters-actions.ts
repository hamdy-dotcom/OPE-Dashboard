"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { savedFiltersTable } from "@/lib/saved-filters-db";
import { requireUser } from "@/lib/auth";
import {
  dbErrorToState,
  readFields,
  UNIQUE_VIOLATION,
  type FormState,
} from "@/lib/forms";

/**
 * Saved filters belong to whoever made them. RLS enforces that; these actions
 * set `user_id` from the session and never accept it from the client.
 */

const nameSchema = z.object({
  module: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1, { message: "required" }).max(120),
});

const idSchema = z.object({
  module: z.string().trim().min(1).max(60),
  id: z.string().trim().uuid({ message: "required" }),
});

/**
 * The bar posts its whole composition as JSON — fields, operators and values —
 * so reopening a view restores exactly what was saved.
 */
const stateSchema = z.object({
  q: z.string().default(""),
  rows: z
    .array(
      z.object({
        field: z.string().min(1),
        operator: z.string().min(1),
        value: z.string().default(""),
      }),
    )
    .default([]),
});

function readState(formData: FormData) {
  const raw = formData.get("state");
  if (typeof raw !== "string") return { q: "", rows: [] };
  try {
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : { q: "", rows: [] };
  } catch {
    return { q: "", rows: [] };
  }
}

const refresh = (module: string) => revalidatePath(`/[locale]/${module}`, "page");

export async function saveView(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = await getLocale();
  const user = await requireUser(locale);

  const parsed = nameSchema.safeParse(readFields(formData, ["module", "name"] as const));
  if (!parsed.success) {
    return { formError: null, fieldErrors: { name: "required" } };
  }

  const table = await savedFiltersTable();
  const { error } = await table.insert({
    user_id: user.id,
    module: parsed.data.module,
    name: parsed.data.name,
    filter_state: readState(formData),
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { formError: null, fieldErrors: { name: "filterNameTaken" } };
    }
    return dbErrorToState(error);
  }

  refresh(parsed.data.module);
  return { formError: null, fieldErrors: {} };
}

export async function renameView(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = await getLocale();
  await requireUser(locale);

  const target = idSchema.safeParse(readFields(formData, ["module", "id"] as const));
  const named = nameSchema.safeParse(readFields(formData, ["module", "name"] as const));
  if (!target.success || !named.success) {
    return { formError: null, fieldErrors: { name: "required" } };
  }

  const table = await savedFiltersTable();
  const { error } = await table
    .update({ name: named.data.name })
    .eq("id", target.data.id);

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { formError: null, fieldErrors: { name: "filterNameTaken" } };
    }
    return dbErrorToState(error);
  }

  refresh(target.data.module);
  return { formError: null, fieldErrors: {} };
}

export async function deleteView(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = await getLocale();
  await requireUser(locale);

  const parsed = idSchema.safeParse(readFields(formData, ["module", "id"] as const));
  if (!parsed.success) return { formError: "saveFailed", fieldErrors: {} };

  const table = await savedFiltersTable();
  const { error } = await table.delete().eq("id", parsed.data.id);
  if (error) return dbErrorToState(error);

  refresh(parsed.data.module);
  return { formError: null, fieldErrors: {} };
}

/**
 * Marks one as the landing default. A partial unique index allows only one per
 * user per module, so the others are cleared first.
 */
export async function setDefaultView(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const locale = await getLocale();
  const user = await requireUser(locale);

  const parsed = idSchema.safeParse(readFields(formData, ["module", "id"] as const));
  if (!parsed.success) return { formError: "saveFailed", fieldErrors: {} };

  const makeDefault = formData.get("makeDefault") !== "false";

  const cleared = await (await savedFiltersTable())
    .update({ is_default: false })
    .eq("module", parsed.data.module)
    .eq("user_id", user.id)
    .eq("is_default", true);

  if (cleared.error) return dbErrorToState(cleared.error);

  if (makeDefault) {
    const { error } = await (await savedFiltersTable())
      .update({ is_default: true })
      .eq("id", parsed.data.id);
    if (error) return dbErrorToState(error);
  }

  refresh(parsed.data.module);
  return { formError: null, fieldErrors: {} };
}
