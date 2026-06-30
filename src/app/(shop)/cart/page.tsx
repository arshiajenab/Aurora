"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  useCartStore,
  selectCartCount,
  selectCartSubtotal,
} from "@/features/cart/store/cart-store";
import { ClearBagButton } from "@/features/cart/components/cart-sheet";
import { useMounted } from "@/shared/hooks/use-mounted";
import { EmptyState } from "@/shared/components/empty-state";
import { Eyebrow } from "@/shared/components/section-heading";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import { clamp, formatCurrency } from "@/lib/format";

/**
 * /cart — full cart page.
 *
 * Client Component because it reads from the persisted cart store.
 * `useMounted` gates the rendering of the line items + totals so SSR markup
 * doesn't mismatch with the hydrated client state.
 */
export default function CartPage() {
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectCartSubtotal);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0
    ? 0
    : SHIPPING_FLAT_RATE;
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));
  const remainingForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - subtotal,
  );

  // Before mount, render a stable skeleton to avoid hydration mismatch.
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Bag</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">Your bag</h1>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 w-full skeleton-shimmer rounded-2xl"
              />
            ))}
          </div>
          <div className="h-72 w-full skeleton-shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Bag</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your bag
            {count > 0 && (
              <span className="ml-3 text-base font-normal text-muted-foreground tabular-nums">
                {count} {count === 1 ? "item" : "items"}
              </span>
            )}
          </h1>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-full">
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Continue shopping
            </Link>
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={ShoppingBag}
            title="Your bag is empty"
            description="Discover considered objects worth keeping — start with the catalog."
            action={
              <Button asChild className="rounded-full">
                <Link href="/products">Browse the catalog</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Line items */}
          <section aria-label="Line items">
            {/* Desktop header */}
            <div className="hidden grid-cols-[1fr_120px_120px_40px] gap-4 border-b border-border/60 pb-3 text-xs uppercase tracking-luxe text-muted-foreground md:grid">
              <span>Product</span>
              <span className="text-center">Quantity</span>
              <span className="text-right">Total</span>
              <span />
            </div>

            <ul className="divide-y divide-border/60">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-1 gap-4 py-5 md:grid-cols-[1fr_120px_120px_40px] md:items-center"
                >
                  {/* Product cell */}
                  <div className="flex items-center gap-4">
                    <Link
                      href={`/products/${item.id}`}
                      className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
                    >
                      <Image
                        src={item.thumbnail}
                        alt={item.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </Link>
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/products/${item.id}`}
                        className="line-clamp-2 text-sm font-medium tracking-tight hover:underline"
                      >
                        {item.title}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {formatCurrency(item.price)} each
                      </span>
                      {/* Mobile qty + total */}
                      <div className="mt-2 flex items-center justify-between gap-3 md:hidden">
                        <div className="inline-flex items-center rounded-full border">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                            aria-label={`Decrease ${item.title}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-medium tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.id,
                                clamp(item.quantity + 1, 1, item.maxStock),
                              )
                            }
                            disabled={item.quantity >= item.maxStock}
                            aria-label={`Increase ${item.title}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Desktop qty */}
                  <div className="hidden justify-center md:flex">
                    <div className="inline-flex items-center rounded-full border">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity - 1)
                        }
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease ${item.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            clamp(item.quantity + 1, 1, item.maxStock),
                          )
                        }
                        disabled={item.quantity >= item.maxStock}
                        aria-label={`Increase ${item.title}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Desktop total */}
                  <div className="hidden text-right md:block">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>

                  {/* Remove */}
                  <div className="hidden justify-end md:flex">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.title} from bag`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mobile remove (full-width row) */}
                  <div className="md:hidden">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex justify-start">
              <ClearBagButton />
            </div>
          </section>

          {/* Order summary */}
          <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
            <Card className="rounded-2xl border-border/60 p-6">
              <h2 className="text-base font-semibold tracking-tight">
                Order summary
              </h2>

              {/* Free shipping progress */}
              <div className="mt-4 rounded-xl bg-muted/50 p-3">
                {remainingForFreeShipping > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Add{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(remainingForFreeShipping)}
                    </span>{" "}
                    more to unlock free shipping.
                  </p>
                ) : (
                  <p className="text-xs font-medium text-foreground">
                    You&apos;ve unlocked free shipping.
                  </p>
                )}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-all"
                    style={{
                      width: `${Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              <dl className="mt-5 flex flex-col gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(subtotal)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Shipping</dt>
                  <dd className="font-medium tabular-nums">
                    {shipping === 0 ? "Free" : formatCurrency(shipping)}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Tax ({(TAX_RATE * 100).toFixed(0)}%)
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrency(tax)}
                  </dd>
                </div>

                <Separator className="my-1" />

                <div className="flex items-baseline justify-between">
                  <dt className="text-sm font-medium">Total</dt>
                  <dd className="text-xl font-semibold tracking-tight tabular-nums">
                    {formatCurrency(total)}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-col gap-2">
                <Button asChild size="lg" className="w-full rounded-full">
                  <Link href="/checkout">Proceed to checkout</Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-full"
                >
                  <Link href="/products">Continue shopping</Link>
                </Button>
              </div>

              <p className="mt-4 text-center text-[11px] text-muted-foreground">
                Taxes &amp; shipping calculated at checkout.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
