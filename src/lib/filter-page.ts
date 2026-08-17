import {
  isFilterStateEmpty,
  readFilterState,
  type FilterOption,
  type FilterState,
} from "@/lib/filters";
import { defaultSavedView, loadSavedViews, type SavedView } from "@/lib/saved-filters";

type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * What every list page needs: the composition to apply, and the user's saved
 * views.
 *
 * A default view is applied only when the URL carries no filter at all.
 * "Clear all" navigates with `clear=1`, which is what stops the default from
 * immediately reapplying itself and making the button look broken.
 */
export async function resolveFilters(
  module: string,
  params: RawSearchParams,
): Promise<{ state: FilterState; saved: SavedView[] }> {
  const fromUrl = readFilterState(params);
  const saved = await loadSavedViews(module);

  const cleared = (Array.isArray(params.clear) ? params.clear[0] : params.clear) === "1";
  const fallback = cleared ? null : defaultSavedView(saved);

  const state = isFilterStateEmpty(fromUrl) && fallback ? fallback.state : fromUrl;

  return { state, saved };
}

/** Distinct non-empty values of a column, as options. Sorted for a stable menu. */
export function optionsFrom<T>(
  rows: T[],
  get: (row: T) => string | null,
): FilterOption[] {
  const seen = new Set<string>();

  for (const row of rows) {
    const value = get(row);
    if (value !== null && value !== "") seen.add(value);
  }

  return [...seen]
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
}

/** Options from records that carry their own id and label. */
export const optionsOf = <T>(
  rows: T[],
  get: (row: T) => { value: string; label: string },
): FilterOption[] => rows.map(get);
