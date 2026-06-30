/**
 * Recently-viewed store — ephemeral-feeling but persisted, capped and
 * deduped so it never grows unbounded.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, RecentlyViewedItem } from "@/types";

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  hydrated: boolean;
  setHydrated: () => void;
  push: (product: Product) => void;
  clear: () => void;
}

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      push: (product) =>
        set((state) => {
          const without = state.items.filter((i) => i.id !== product.id);
          const next: RecentlyViewedItem = {
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            price: product.price,
            viewedAt: Date.now(),
          };
          return { items: [next, ...without].slice(0, 10) };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "aurora-recently-viewed",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
