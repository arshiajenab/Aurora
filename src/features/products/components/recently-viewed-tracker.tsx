"use client";

import * as React from "react";
import { useRecentlyViewedStore } from "@/features/recently-viewed/store/recently-viewed-store";
import type { Product } from "@/types";

/**
 * RecentlyViewedTracker — a no-op island that pushes the current product to
 * the persisted recently-viewed store when the component mounts.
 *
 * Returns null — purely a side effect.
 */
export function RecentlyViewedTracker({ product }: { product: Product }) {
  const push = useRecentlyViewedStore((s) => s.push);

  React.useEffect(() => {
    push(product);
    // We intentionally only push on mount — `product` identity changes
    // when navigating between product pages, which is exactly when we
    // want a new entry.
  }, [product.id, push]);

  return null;
}
