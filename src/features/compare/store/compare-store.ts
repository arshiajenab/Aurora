"use client";

/**
 * Compare store — client-side source of truth for instant UX, with a
 * background sync to the backend when the user is authenticated.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product } from "@/types";

export const MAX_COMPARE = 4;

interface CompareState {
  ids: number[];
  hydrated: boolean;
  setHydrated: () => void;
  has: (id: number) => boolean;
  toggle: (product: Product) => void;
  add: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  setIds: (ids: number[]) => void;
}

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      ids: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      has: (id) => get().ids.includes(id),
      toggle: (product) =>
        set((state) => {
          if (state.ids.includes(product.id)) {
            return { ids: state.ids.filter((i) => i !== product.id) };
          }
          if (state.ids.length >= MAX_COMPARE) return state;
          return { ids: [...state.ids, product.id] };
        }),
      add: (id) =>
        set((state) =>
          state.ids.includes(id) || state.ids.length >= MAX_COMPARE
            ? state
            : { ids: [...state.ids, id] },
        ),
      remove: (id) =>
        set((state) => ({ ids: state.ids.filter((i) => i !== id) })),
      clear: () => set({ ids: [] }),
      setIds: (ids) => set({ ids: ids.slice(0, MAX_COMPARE) }),
    }),
    {
      name: "aurora-compare",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);

export const selectCompareCount = (state: CompareState): number =>
  state.ids.length;
