/**
 * Wishlist store — persisted, minimal, deduped.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, WishlistItem } from "@/types";

interface WishlistState {
  items: WishlistItem[];
  hydrated: boolean;
  setHydrated: () => void;
  toggle: (product: Product) => void;
  remove: (productId: number) => void;
  has: (productId: number) => boolean;
  clear: () => void;
  /** Replace the entire list (used by auth sync after fetching from backend). */
  setItems: (items: WishlistItem[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      toggle: (product) =>
        set((state) => {
          const exists = (state.items ?? []).some((i) => i.id === product.id);
          if (exists) {
            return {
              items: state.items.filter((i) => i.id !== product.id),
            };
          }
          const item: WishlistItem = {
            id: product.id,
            title: product.title,
            thumbnail: product.thumbnail,
            price: product.price,
            addedAt: Date.now(),
          };
          // Keep most-recently-added first; cap at 50 to bound storage.
          return { items: [item, ...state.items].slice(0, 50) };
        }),
      remove: (productId) =>
        set((state) => ({
          items: (state.items ?? []).filter((i) => i.id !== productId),
        })),
      has: (productId) => (get().items ?? []).some((i) => i.id === productId),
      clear: () => set({ items: [] }),
      setItems: (items) => set({ items: items.slice(0, 50) }),
    }),
    {
      name: "aurora-wishlist",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

export const selectWishlistCount = (state: WishlistState): number =>
  state.items.length;
