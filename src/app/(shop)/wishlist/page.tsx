"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, Trash2, ShoppingBag, ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/shared/components/empty-state";
import { Eyebrow } from "@/shared/components/section-heading";
import { useWishlistStore } from "@/features/wishlist/store/wishlist-store";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * /wishlist — client-rendered wishlist page.
 *
 *  - Reads persisted wishlist store; gated on `useMounted`.
 *  - Each card supports remove + "Add to bag". Adding fetches the live
 *    product via /api/products/{id} (so we have stock + category), then
 *    calls the cart store.
 *  - "Move all to bag" does the same for every item, in parallel.
 */
export default function WishlistPage() {
  const mounted = useMounted();
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.remove);
  const clearWishlist = useWishlistStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  const [busyId, setBusyId] = React.useState<number | null>(null);
  const [movingAll, setMovingAll] = React.useState(false);

  const addSingle = async (id: number) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error("Product unavailable");
      const product = (await res.json()) as Product;
      addItem(product, 1);
      toast.success("Added to bag", { description: product.title });
    } catch {
      toast.error("Couldn't add to bag", {
        description: "This product may no longer be available.",
      });
    } finally {
      setBusyId(null);
    }
  };

  const moveAll = async () => {
    if (items.length === 0) return;
    setMovingAll(true);
    try {
      const results = await Promise.allSettled(
        items.map(async (item) => {
          const res = await fetch(`/api/products/${item.id}`);
          if (!res.ok) throw new Error(`Product ${item.id} unavailable`);
          const product = (await res.json()) as Product;
          addItem(product, 1);
          return product.title;
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;
      if (ok > 0) {
        toast.success(`Added ${ok} ${ok === 1 ? "item" : "items"} to bag`, {
          description:
            fail > 0
              ? `${fail} could not be added (no longer available).`
              : "Your wishlist has been moved to your bag.",
        });
      } else {
        toast.error("Couldn't move items", {
          description: "These products are no longer available.",
        });
      }
    } finally {
      setMovingAll(false);
    }
  };

  // Pre-mount skeleton.
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Saved</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">Wishlist</h1>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] w-full skeleton-shimmer rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Saved</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Wishlist
            {items.length > 0 && (
              <span className="ml-3 text-base font-normal text-muted-foreground tabular-nums">
                {items.length} {items.length === 1 ? "item" : "items"}
              </span>
            )}
          </h1>
          {items.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={moveAll}
                disabled={movingAll}
                className="gap-1.5 rounded-full"
              >
                {movingAll ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/40 border-t-foreground" />
                    Moving…
                  </>
                ) : (
                  <>
                    <ShoppingBag className="h-3.5 w-3.5" />
                    Move all to bag
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  clearWishlist();
                  toast.success("Wishlist cleared");
                }}
                className="gap-1.5 rounded-full text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10">
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
        </div>
      ) : (
        <>
          <Separator className="mt-6" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {items.map((item) => {
              const busy = busyId === item.id;
              return (
                <div
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border"
                >
                  <Link
                    href={`/products/${item.id}`}
                    className="relative aspect-square overflow-hidden bg-muted"
                  >
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <Link
                      href={`/products/${item.id}`}
                      className="line-clamp-2 text-sm font-medium tracking-tight hover:underline"
                    >
                      {item.title}
                    </Link>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.price)}
                    </span>
                    <div className="mt-auto flex items-center gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => addSingle(item.id)}
                        disabled={busy}
                        className="flex-1 gap-1.5 rounded-full"
                      >
                        {busy ? (
                          <>
                            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                            Adding…
                          </>
                        ) : (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Add to bag
                          </>
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.id);
                          toast.success("Removed from wishlist", {
                            description: item.title,
                          });
                        }}
                        aria-label={`Remove ${item.title} from wishlist`}
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-full">
              <Link href="/products">
                Continue shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
