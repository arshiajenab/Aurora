"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  useCartStore,
  selectCartCount,
  selectCartSubtotal,
} from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import {
  formatCurrency,
  clamp,
} from "@/lib/format";
import { SHIPPING_FLAT_RATE, FREE_SHIPPING_THRESHOLD } from "@/lib/constants";

/**
 * CartSheet — slide-out bag.
 *
 * Uses shadcn Sheet (Radix Dialog) for accessibility, with Framer Motion
 * entry/exit on the line items for a polished feel. Subtotal + shipping
 * progress are derived selectors, never stored.
 */
export function CartSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const count = useCartStore(selectCartCount);
  const subtotal = useCartStore(selectCartSubtotal);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-screen w-full flex-col gap-0 border-l p-0 sm:max-w-md">
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b px-6 py-5">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            <SheetTitle className="text-base font-semibold tracking-tight">
              Your Bag
            </SheetTitle>
            {mounted && count > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                {count}
              </span>
            )}
          </div>
          <SheetDescription className="sr-only">
            Review the items in your shopping bag and proceed to checkout.
          </SheetDescription>
        </SheetHeader>

        {!mounted || items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Your bag is empty</p>
              <p className="text-sm text-muted-foreground">
                Discover considered objects worth keeping.
              </p>
            </div>
            <Button asChild variant="outline" className="mt-2 rounded-full">
              <Link href="/products" onClick={() => onOpenChange(false)}>
                Browse the catalog
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Free-shipping progress */}
            <div className="border-b px-6 py-4">
              <p className="text-xs text-muted-foreground">
                {remainingForFreeShipping > 0 ? (
                  <>
                    You&apos;re{" "}
                    <span className="font-medium text-foreground">
                      {formatCurrency(remainingForFreeShipping)}
                    </span>{" "}
                    away from free shipping.
                  </>
                ) : (
                  <span className="font-medium text-foreground">
                    You&apos;ve unlocked free shipping.
                  </span>
                )}
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-foreground"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>

            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
              <ul className="divide-y">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex gap-4 px-6 py-4"
                    >
                      <Link
                        href={`/products/${item.id}`}
                        onClick={() => onOpenChange(false)}
                        className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border bg-muted"
                      >
                        <Image
                          src={item.thumbnail}
                          alt={item.title}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </Link>
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/products/${item.id}`}
                            onClick={() => onOpenChange(false)}
                            className="line-clamp-2 text-sm font-medium leading-snug hover:underline"
                          >
                            {item.title}
                          </Link>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            aria-label={`Remove ${item.title} from bag`}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(item.price)} each
                        </span>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center rounded-full border">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              aria-label={`Decrease quantity of ${item.title}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-l-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                              disabled={item.quantity <= 1}
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
                              aria-label={`Increase quantity of ${item.title}`}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-r-full text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                              disabled={item.quantity >= item.maxStock}
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            <div className="shrink-0 border-t px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <Separator className="my-4" />
              <div className="flex flex-col gap-2">
                <Button asChild className="w-full rounded-full">
                  <Link href="/checkout" onClick={() => onOpenChange(false)}>
                    Checkout
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  className="w-full rounded-full"
                >
                  <Link href="/cart" onClick={() => onOpenChange(false)}>
                    View full bag
                  </Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Floating "clear bag" affordance, kept separate for reuse. */
export function ClearBagButton() {
  const clear = useCartStore((s) => s.clear);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5 text-muted-foreground"
      onClick={() => clear()}
    >
      <Trash2 className="h-3.5 w-3.5" />
      Clear bag
    </Button>
  );
}
