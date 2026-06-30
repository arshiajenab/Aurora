"use client";

import * as React from "react";
import { Minus, Plus, Heart, ShoppingBag, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clamp } from "@/lib/format";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useWishlistStore } from "@/features/wishlist/store/wishlist-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import type { Product } from "@/types";

/**
 * ProductActions — quantity selector + add to bag + wishlist toggle.
 *
 * Client-only because it mutates persisted client stores.
 * The `mounted` gate keeps SSR markup from mismatching persisted state.
 */
export function ProductActions({ product }: { product: Product }) {
  const mounted = useMounted();
  const [qty, setQty] = React.useState(1);
  const [adding, setAdding] = React.useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const inWishlist = useWishlistStore((s) =>
    s.items.some((i) => i.id === product.id),
  );

  const outOfStock = product.stock <= 0;
  const maxQty = Math.max(1, product.stock);

  const handleAdd = async () => {
    if (outOfStock) return;
    setAdding(true);
    // Brief animation delay for perceived quality.
    await new Promise((r) => setTimeout(r, 350));
    addItem(product, qty);
    setAdding(false);
    toast.success("Added to bag", {
      description: `${qty} × ${product.title}`,
    });
  };

  const handleWishlist = () => {
    toggleWishlist(product);
    toast.success(
      inWishlist ? "Removed from wishlist" : "Saved to wishlist",
      { description: product.title },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity selector */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-muted-foreground">
          Quantity
        </span>
        <div className="inline-flex items-center rounded-full border">
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 1, 1, maxQty))}
            disabled={qty <= 1 || outOfStock}
            aria-label="Decrease quantity"
            className="inline-flex h-9 w-9 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-sm font-medium tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 1, 1, maxQty))}
            disabled={qty >= maxQty || outOfStock}
            aria-label="Increase quantity"
            className="inline-flex h-9 w-9 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {outOfStock
            ? "Out of stock"
            : `${product.stock} ${product.stock === 1 ? "unit" : "units"} available`}
        </span>
      </div>

      {/* Action row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          size="lg"
          onClick={handleAdd}
          disabled={outOfStock || adding}
          className="flex-1 gap-2 rounded-full"
        >
          {adding ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
              Adding…
            </>
          ) : (
            <>
              <ShoppingBag className="h-4 w-4" />
              {outOfStock ? "Sold out" : "Add to bag"}
            </>
          )}
        </Button>

        <Button
          type="button"
          size="lg"
          variant="outline"
          onClick={handleWishlist}
          aria-pressed={mounted ? inWishlist : false}
          className="gap-2 rounded-full"
        >
          {mounted && inWishlist ? (
            <>
              <Check className="h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Heart className="h-4 w-4" />
              Wishlist
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
