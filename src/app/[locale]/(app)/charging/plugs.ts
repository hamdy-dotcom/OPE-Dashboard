/**
 * The `plug_selection` enum, in a module of its own so the form can import it.
 *
 * `queries.ts` reaches `next/headers` through the Supabase server client, so a
 * Client Component may only import types from it — never a value.
 */
export type PlugSelection = "A" | "B" | "A+B";

export const PLUG_OPTIONS: PlugSelection[] = ["A", "B", "A+B"];
