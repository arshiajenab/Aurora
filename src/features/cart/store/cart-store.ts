/**
 * Shopping cart store.
 *
 * Design notes:
 *  - Persisted to localStorage so a refresh never empties the cart.
 *  - We DON'T persist derived fields (totals) — they're computed selectors,
 *    keeping the store shape minimal and avoiding stale data.
 *  - Hydration-safe: components read via `useCartStore` which is only
 *    consumed inside Client Components, and the provider gates rendering
 *    until mounted (see `mounted` pattern in the header).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem, Product } from "@/types";
import { clamp } from "@/lib/format";

interface CartState {
  items: CartItem[];
  /** Hydration flag — false on the server, true after mount. */
  hydrated: boolean;
  setHydrated: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      addItem: (product, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === product.id
                  ? {
                      ...i,
                      quantity: clamp(
                        i.quantity + quantity,
                        1,
                        Math.max(product.stock, i.quantity + quantity),
                      ),
                    }
                  : i,
              ),
            };
          }
          const item: CartItem = {
            id: product.id,
            title: product.title,
            price: product.price,
            thumbnail: product.thumbnail,
            category: product.category,
            quantity: clamp(quantity, 1, Math.max(product.stock, 1)),
            maxStock: product.stock,
          };
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.id !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.id === productId
              ? { ...i, quantity: clamp(quantity, 1, Math.max(i.maxStock, 1)) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
    }),
    {
      name: "aurora-cart",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
      // We only persist the data, not the hydration flag.
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

/* ---------------- Derived selectors (pure) ---------------- */

export function selectCartCount(state: CartState): number {
  return state.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function selectCartSubtotal(state: CartState): number {
  return Number(
    state.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2),
  );
}
