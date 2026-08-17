"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * False during server render and the hydrating pass, true afterwards.
 *
 * For values that genuinely differ between the server and the browser — a
 * timestamp rendered in the viewer's timezone, say — render the neutral form
 * first and the real one once this flips. Doing the same with an effect would
 * mean setState in an effect body, which cascades renders.
 */
export const useHydrated = () =>
  useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
