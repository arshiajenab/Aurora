"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Plus, Star, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";
import { useWishlistStore } from "@/features/wishlist/store/wishlist-store";
import {
  useCompareStore,
  MAX_COMPARE,
} from "@/features/compare/store/compare-store";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import { toast } from "sonner";
import { titleCaseSlug } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ProductCard — the workhorse of the catalog.
 *
 * Decisions:
 *  - Framer Motion `whileHover` for a subtle lift + image zoom (premium).
 *  - next/image with a blurred data-URL placeholder would require runtime
 *    access to the image bytes; instead we use a neutral shimmer backdrop
 *    via the container, which is good enough and avoids extra network hops.
 *  - Wishlist + compare + quick-add are client-only and gated on `mounted`
 *    to avoid hydration mismatches with persisted state.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product;
  priority?: boolean;
  className?: string;
}) {
  const mounted = useMounted();
  const toggleWishlist = useWishlistStore((s) => s.toggle);
  const addItem = useCartStore((s) => s.addItem);
  const toggleCompare = useCompareStore((s) => s.toggle);
  // Read wishlist + compare inline without subscribing to the whole store.
  const inWishlist = useWishlistStore((s) =>
    Array.isArray(s.items) ? s.items.some((i) => i.id === product.id) : false,
  );
  const inCompare = useCompareStore((s) => s.ids.includes(product.id));
  const compareFull = useCompareStore(
    (s) => s.ids.length >= MAX_COMPARE && !s.ids.includes(product.id),
  );

  const discount = product.discountPercentage > 0;
  const outOfStock = product.stock <= 0;

  const handleQuickAdd = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (outOfStock) return;
      addItem(product, 1);
      toast.success("Added to bag", {
        description: product.title,
      });
    },
    [addItem, product, outOfStock],
  );

  const handleWishlist = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toggleWishlist(product);
      toast.success(
        inWishlist ? "Removed from wishlist" : "Saved to wishlist",
        { description: product.title },
      );
    },
    [toggleWishlist, product, inWishlist],
  );

  const handleCompare = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (compareFull) return;
      const willAdd = !inCompare;
      toggleCompare(product);
      toast.success(
        willAdd ? "Added to compare" : "Removed from compare",
        { description: product.title },
      );
    },
    [toggleCompare, product, inCompare, compareFull],
  );

  // Stable label/state derived from mounted+store so SSR markup matches.
  const compareActive = mounted && inCompare;
  const compareDisabled = mounted && compareFull;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn("group relative", className)}
    >
      <Link
        href={`/products/${product.id}`}
        className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors duration-300 hover:border-border"
        aria-label={`View ${product.title}`}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            className={cn(
              "object-cover transition-transform duration-700 ease-out group-hover:scale-105",
              outOfStock && "opacity-60 grayscale",
            )}
          />

          {/* Top-left badges */}
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col gap-1.5">
            {discount && (
              <span className="rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
                -{Math.round(product.discountPercentage)}%
              </span>
            )}
            {outOfStock && (
              <span className="rounded-full bg-foreground/80 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background backdrop-blur">
                Sold out
              </span>
            )}
          </div>

          {/* Top-right actions — wishlist + compare */}
          <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={handleWishlist}
              aria-pressed={mounted ? inWishlist : false}
              aria-label={
                mounted && inWishlist
                  ? `Remove ${product.title} from wishlist`
                  : `Add ${product.title} to wishlist`
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-all duration-200 hover:bg-background hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-all",
                  mounted && inWishlist
                    ? "fill-foreground text-foreground"
                    : "text-foreground",
                )}
              />
            </button>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleCompare}
                    disabled={compareDisabled}
                    aria-pressed={compareActive}
                    aria-label={
                      compareActive
                        ? `Remove ${product.title} from compare`
                        : `Add ${product.title} to compare`
                    }
                    className={cn(
                      "inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur-md transition-all duration-200 hover:bg-background hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      compareDisabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <Scale
                      className={cn(
                        "h-4 w-4 transition-all",
                        compareActive && "fill-foreground text-foreground",
                      )}
                    />
                  </button>
                </TooltipTrigger>
                {compareDisabled && (
                  <TooltipContent side="left">
                    Compare list full
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Quick add — slides up on hover (desktop) / always visible (touch) */}
          <div className="absolute inset-x-3 bottom-3 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 max-sm:translate-y-0 max-sm:opacity-100">
            <Button
              type="button"
              onClick={handleQuickAdd}
              disabled={outOfStock}
              size="sm"
              className="w-full gap-1.5 rounded-full bg-foreground/95 text-background shadow-md backdrop-blur hover:bg-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              {outOfStock ? "Sold out" : "Add to bag"}
            </Button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-1 flex-col gap-1.5 p-4">
          <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <span className="truncate">{titleCaseSlug(product.category)}</span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Star className="h-3 w-3 fill-current" />
              {product.rating.toFixed(1)}
            </span>
          </div>
          <h3 className="line-clamp-1 text-sm font-medium tracking-tight">
            {product.title}
          </h3>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatCurrency(product.price)}
            </span>
            {discount && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">
                {formatCurrency(product.priceBeforeDiscount)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

/** Skeleton matching ProductCard's layout for loading states. */
export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card">
      <div className="aspect-square skeleton-shimmer" />
      <div className="flex flex-col gap-2 p-4">
        <div className="h-3 w-1/3 skeleton-shimmer rounded" />
        <div className="h-4 w-3/4 skeleton-shimmer rounded" />
        <div className="h-4 w-1/4 skeleton-shimmer rounded" />
      </div>
    </div>
  );
}
