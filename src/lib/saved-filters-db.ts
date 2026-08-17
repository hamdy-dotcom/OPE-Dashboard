import { createClient } from "@/lib/supabase/server";

/**
 * `saved_filters` ships in migration 0002, which is newer than the checked-in
 * generated types — so the typed client does not know the table exists.
 *
 * This is the single place that gap is bridged. Running the migration and
 * regenerating (`npx supabase gen types typescript ... > src/lib/supabase/types.ts`)
 * makes it removable; until then every caller narrows the result into an
 * explicit type of its own immediately, so the untyped surface stays one line
 * wide rather than spreading through the module.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function savedFiltersTable() {
  const supabase = await createClient();
  return (supabase as any).from("saved_filters");
}
/* eslint-enable @typescript-eslint/no-explicit-any */
