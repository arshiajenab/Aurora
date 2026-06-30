"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Loader2, ShoppingCart, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { EmptyState } from "@/shared/components/empty-state";
import { useWishlistStore } from "@/features/wishlist/store/wishlist-store";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/types";

/**
 * /account/wishlist — for authenticated users the persisted client store is
 * kept in sync with the backend (see use-auth sync effect). This page reads
 * the store and resolves full product data for each id, with "Move to cart"
 * and "Remove" actions.
 *
 * Guest users land here only if middleware lets them through (it shouldn't —
 * /account/* is protected), but we still guard on `useAuth().user` to be safe.
 */
export default function AccountWishlistPage() {
  const mounted = useMounted();
  const { user } = useAuth();
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.remove);
  const clearWishlist = useWishlistStore((s) => s.clear);
  const addItemToCart = useCartStore((s) => s.addItem);

  const [products, setProducts] = React.useState<Record<number, Product>>({});
  const [loading, setLoading] = React.useState(true);
  const [movingId, setMovingId] = React.useState<number | null>(null);

  // Resolve full product data for each wishlist id.
  const ids = items.map((i) => i.id);
  React.useEffect(() => {
    if (!mounted || ids.length === 0) {
      setLoading(false);
      setProducts({});
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      ids.map((id) =>
        fetch(`/api/products/${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((p: Product | null) => (p ? [id, p] : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<number, Product> = {};
      for (const r of results) {
        if (r) map[r[0] as number] = r[1] as Product;
      }
      setProducts(map);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [mounted, ids]);

  const handleMoveToCart = async (productId: number) => {
    const product = products[productId];
    if (!product) return;
    setMovingId(productId);
    try {
      addItemToCart(product, 1);
      removeItem(productId);
      // Best-effort backend sync (the store's auth-sync handles persistence,
      // but we also hit the API for immediacy when authed).
      if (user) {
        await fetch(`/api/wishlist/${productId}`, { method: "DELETE" }).catch(
          () => {},
        );
      }
      toast.success("Moved to bag", { description: product.title });
    } finally {
      setMovingId(null);
    }
  };

  const handleRemove = (productId: number) => {
    const product = products[productId];
    removeItem(productId);
    if (user) {
      fetch(`/api/wishlist/${productId}`, { method: "DELETE" }).catch(() => {});
    }
    toast.success("Removed from wishlist", {
      description: product?.title,
    });
  };

  const handleClear = () => {
    clearWishlist();
    if (user) {
      fetch("/api/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [] }),
      }).catch(() => {});
    }
    toast.success("Wishlist cleared");
  };

  const showSkeleton = !mounted || loading;
  const isEmpty = mounted && items.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Eyebrow>Saved</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Wishlist
            </h1>
            <p className="text-sm text-muted-foreground">
              {mounted && items.length > 0
                ? `${items.length} ${items.length === 1 ? "item" : "items"} saved for later.`
                : "Products you're considering, all in one place."}
            </p>
          </div>
          {mounted && items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-destructive"
              onClick={handleClear}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </Button>
          )}
        </div>
      </Reveal>

      {isEmpty ? (
        <Reveal delay={0.05}>
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on any product to save it here for later."
            action={
              <Button asChild className="rounded-full">
                <Link href="/products">Browse the catalog</Link>
              </Button>
            }
          />
        </Reveal>
      ) : showSkeleton ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden rounded-2xl p-0">
              <div className="aspect-square skeleton-shimmer" />
              <div className="flex flex-col gap-2 p-4">
                <div className="h-4 w-3/4 skeleton-shimmer rounded" />
                <div className="h-4 w-1/4 skeleton-shimmer rounded" />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const product = products[item.id];
              if (!product) return null;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="group flex flex-col overflow-hidden rounded-2xl border-border/60 p-0">
                    <Link
                      href={`/products/${product.id}`}
                      className="relative aspect-square overflow-hidden bg-muted"
                    >
                      <Image
                        src={product.thumbnail}
                        alt={product.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handleRemove(product.id);
                        }}
                        aria-label={`Remove ${product.title} from wishlist`}
                        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Link>
                    <div className="flex flex-1 flex-col gap-3 p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                          {product.category}
                        </span>
                        <Link
                          href={`/products/${product.id}`}
                          className="line-clamp-2 text-sm font-medium tracking-tight hover:underline"
                        >
                          {product.title}
                        </Link>
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                        <Button
                          size="sm"
                          className="gap-1.5 rounded-full"
                          disabled={movingId === product.id || product.stock <= 0}
                          onClick={() => handleMoveToCart(product.id)}
                        >
                          {movingId === product.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-3.5 w-3.5" />
                          )}
                          {product.stock <= 0 ? "Sold out" : "Move to bag"}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
