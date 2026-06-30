"use client";

import * as React from "react";
import Link from "next/link";
import { useRecentlyViewedStore } from "@/features/recently-viewed/store/recently-viewed-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import { ProductCardSkeleton } from "@/features/products/components/product-card";
import { Eyebrow } from "@/shared/components/section-heading";
import type { Product } from "@/types";
import { formatCurrency } from "@/lib/format";
import Image from "next/image";

/**
 * RecentlyViewedList — reads the persisted recently-viewed store and renders
 * up to 4 product cards (excluding the current product). Falls back to a
 * subtle prompt when the user hasn't viewed anything yet.
 *
 * Client-only because the store is persisted to localStorage.
 */
export function RecentlyViewedList({
  currentProductId,
  products,
}: {
  currentProductId: number;
  /**
   * Optional prefetched Product objects keyed by id, used to enrich the
   * stored partial data with full images / prices. If absent, we fall back
   * to the partial data stored locally.
   */
  products?: Product[];
}) {
  const mounted = useMounted();
  const items = useRecentlyViewedStore((s) => s.items);

  if (!mounted) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const filtered = items
    .filter((i) => i.id !== currentProductId)
    .slice(0, 4);

  if (filtered.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
        <Eyebrow>Nothing here yet</Eyebrow>
        <p className="mt-3 text-sm text-muted-foreground">
          Products you view will appear here so you can return to them easily.
        </p>
      </div>
    );
  }

  // Index prefetched products for richer cards (price/image override).
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
      {filtered.map((item) => {
        const full = byId.get(item.id);
        const price = full?.price ?? item.price;
        const image = full?.thumbnail ?? item.thumbnail;
        return (
          <Link
            key={item.id}
            href={`/products/${item.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border"
          >
            <div className="relative aspect-square overflow-hidden bg-muted">
              <Image
                src={image}
                alt={item.title}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-1 p-4">
              <h3 className="line-clamp-1 text-sm font-medium tracking-tight">
                {item.title}
              </h3>
              <span className="text-sm font-semibold tabular-nums">
                {formatCurrency(price)}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
