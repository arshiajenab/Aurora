"use client";

import * as React from "react";
import { useCompareStore } from "@/features/compare/store/compare-store";
import { useAuth } from "@/features/auth/hooks/use-auth";

/**
 * CompareSync — invisible client component that mirrors the local compare
 * store to the backend whenever it changes AND the user is authenticated.
 *
 * The AuthProvider (see `use-auth.tsx`) handles the one-time guest→auth
 * sync (push local ids to /api/compare, then refetch and persist). This
 * component handles the *ongoing* sync: any subsequent add/remove on an
 * authed session is mirrored to the server so the user's compare list
 * survives device switches.
 *
 *  - On mount while authed, we skip the first emit (the AuthProvider just
 *    did a PUT during the login transition; this avoids a duplicate).
 *  - Subsequent `ids` changes PUT `{ ids }` to /api/compare (best-effort,
 *    abort-on-unmount to avoid leaked requests on rapid toggles).
 *  - No UI — renders null.
 */
export function CompareSync() {
  const ids = useCompareStore((s) => s.ids);
  const { user } = useAuth();
  const lastSyncedRef = React.useRef<string | null>(null);
  const skipNextRef = React.useRef(true);

  React.useEffect(() => {
    if (!user) {
      // Reset the skip flag so the next login transition re-initialises
      // correctly (AuthProvider will do the first PUT, we skip the first
      // emit afterwards).
      skipNextRef.current = true;
      lastSyncedRef.current = null;
      return;
    }
    if (skipNextRef.current) {
      skipNextRef.current = false;
      lastSyncedRef.current = JSON.stringify(ids);
      return;
    }
    const sig = JSON.stringify(ids);
    if (sig === lastSyncedRef.current) return;
    lastSyncedRef.current = sig;

    const controller = new AbortController();
    void fetch("/api/compare", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
      signal: controller.signal,
      credentials: "same-origin",
    }).catch(() => undefined);
    return () => controller.abort();
  }, [ids, user]);

  return null;
}
