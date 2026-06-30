"use client";

/**
 * Auth context — client-side mirror of the server session.
 *
 *  - On mount, calls /api/auth/me to restore the session (auto-login).
 *  - Exposes signIn/signUp/signOut that hit the auth Route Handlers and
 *    update local state immediately (optimistic).
 *  - Triggers a wishlist + compare DB sync when the user transitions from
 *    guest → authenticated.
 */
import * as React from "react";
import type { PublicUser } from "@/services/users.service";
import type { WishlistItem } from "@/types";

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<PublicUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  // Track the previous user id so we can detect a guest→auth transition.
  const prevUserId = React.useRef<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = (await res.json()) as { user: PublicUser | null };
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // When a user logs in, sync local wishlist + compare to the backend.
  React.useEffect(() => {
    if (!user) {
      prevUserId.current = null;
      return;
    }
    if (prevUserId.current === user.id) return;
    prevUserId.current = user.id;

    // Read persisted client stores and push to backend (best-effort).
    const sync = async () => {
      try {
        const [wishRaw, compareRaw] = await Promise.all([
          window.localStorage.getItem("aurora-wishlist"),
          window.localStorage.getItem("aurora-compare"),
        ]);
        const wishIds = parseIds(wishRaw);
        const compareIds = parseIds(compareRaw);
        await Promise.all([
          fetch("/api/wishlist", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: wishIds }),
          }),
          fetch("/api/compare", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: compareIds }),
          }),
        ]);
        // Hydrate from backend (in case the user had a larger saved list).
        const [wishRes, compareRes] = await Promise.all([
          fetch("/api/wishlist"),
          fetch("/api/compare"),
        ]);
        if (wishRes.ok) {
          const { ids } = (await wishRes.json()) as { ids: number[] };
          // Use the store's setter so in-memory state stays consistent with
          // persistence (direct localStorage writes can desync zustand).
          const { useWishlistStore } = await import(
            "@/features/wishlist/store/wishlist-store"
          );
          useWishlistStore.getState().setItems(idsToWishlistPlaceholder(ids));
        }
        if (compareRes.ok) {
          const { ids } = (await compareRes.json()) as { ids: number[] };
          const { useCompareStore } = await import(
            "@/features/compare/store/compare-store"
          );
          useCompareStore.getState().setIds(ids);
        }
      } catch {
        // Non-critical — local stores remain functional.
      }
    };
    sync();
  }, [user]);

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Sign in failed");
      }
      await refresh();
    },
    [refresh],
  );

  const signUp = React.useCallback(
    async (name: string, email: string, password: string) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) {
        const { error } = (await res.json()) as { error?: string };
        throw new Error(error ?? "Sign up failed");
      }
      await refresh();
    },
    [refresh],
  );

  const signOut = React.useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

function parseIds(raw: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const state = parsed?.state;
    if (Array.isArray(state?.items)) {
      return state.items.map((i: { id?: number }) => i.id).filter(Boolean);
    }
    if (Array.isArray(state?.ids)) return state.ids;
  } catch {
    /* ignore */
  }
  return [];
}

function idsToWishlistPlaceholder(ids: number[]): WishlistItem[] {
  // The wishlist store rehydrates from its own shape; we keep ids only and
  // let the wishlist page fetch full products. This keeps the persisted
  // store consistent.
  return ids.map((id) => ({
    id,
    title: "",
    thumbnail: "",
    price: 0,
    addedAt: 0,
  }));
}
