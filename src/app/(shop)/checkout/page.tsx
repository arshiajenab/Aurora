"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock, ShieldCheck, ArrowLeft, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { Eyebrow } from "@/shared/components/section-heading";
import {
  useCartStore,
  selectCartSubtotal,
} from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { Order } from "@/types";

/**
 * /checkout — client-side checkout form.
 *
 *  - React Hook Form + Zod for typed, accessible validation.
 *  - On submit, POSTs to /api/checkout with `{items, customer}`. The server
 *    resolves live prices from the catalog (never trusts client totals).
 *  - On success, navigates to /order-success?orderId=... and clears the cart.
 *  - On error, shows a toast and stays on the page.
 *  - Empty cart → EmptyState with CTA back to the catalog.
 */

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "Other", label: "Other / Not listed" },
];

const checkoutFormSchema = z.object({
  fullName: z.string().min(2, "Please enter your full name"),
  email: z.string().email("Please enter a valid email"),
  address: z.string().min(4, "Please enter your street address"),
  city: z.string().min(2, "Please enter your city"),
  zip: z.string().min(3, "Please enter your postal code"),
  country: z.string().min(2, "Please select your country"),
});

type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const clearCart = useCartStore((s) => s.clear);

  const [submitting, setSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      address: "",
      city: "",
      zip: "",
      country: "US",
    },
    mode: "onBlur",
  });

  const countryValue = watch("country");

  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0
    ? 0
    : SHIPPING_FLAT_RATE;
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));

  const onSubmit = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      toast.error("Your bag is empty", {
        description: "Add items before checking out.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        customer: values,
      };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(errorBody.error ?? `Checkout failed (${res.status})`);
      }
      const order = (await res.json()) as Order;
      clearCart();
      toast.success("Order placed", {
        description: `Confirmation ${order.id}`,
      });
      router.push(`/order-success?orderId=${encodeURIComponent(order.id)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error("Checkout failed", { description: message });
      setSubmitting(false);
    }
  };

  // Pre-mount: stable skeleton.
  if (!mounted) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Checkout</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div className="h-96 w-full skeleton-shimmer rounded-2xl" />
          <div className="h-72 w-full skeleton-shimmer rounded-2xl" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="You'll need to add items to your bag before you can check out."
          action={
            <Button asChild className="rounded-full">
              <Link href="/products">Browse the catalog</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Checkout</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-full">
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4" />
              Back to bag
            </Link>
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]"
        noValidate
      >
        {/* Form fields */}
        <div className="flex flex-col gap-8">
          {/* Contact */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                1
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Contact
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  autoComplete="name"
                  placeholder="Jane Appleseed"
                  aria-invalid={!!errors.fullName}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-xs text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Shipping */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                2
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Shipping address
              </h2>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="address">Street address</Label>
              <Input
                id="address"
                autoComplete="street-address"
                placeholder="123 Lantern Lane"
                aria-invalid={!!errors.address}
                {...register("address")}
              />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  autoComplete="address-level2"
                  placeholder="Brooklyn"
                  aria-invalid={!!errors.city}
                  {...register("city")}
                />
                {errors.city && (
                  <p className="text-xs text-destructive">
                    {errors.city.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="zip">ZIP / Postal</Label>
                <Input
                  id="zip"
                  autoComplete="postal-code"
                  placeholder="11201"
                  aria-invalid={!!errors.zip}
                  {...register("zip")}
                />
                {errors.zip && (
                  <p className="text-xs text-destructive">
                    {errors.zip.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={countryValue}
                  onValueChange={(v) => setValue("country", v, { shouldValidate: true })}
                >
                  <SelectTrigger
                    id="country"
                    className="w-full"
                    aria-label="Country"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <p className="text-xs text-destructive">
                    {errors.country.message}
                  </p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Secure, encrypted checkout
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              2-year warranty on every order
            </span>
          </div>
        </div>

        {/* Order summary */}
        <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/60 p-6">
            <h2 className="text-base font-semibold tracking-tight">
              Order summary
            </h2>

            <ul className="mt-5 flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="line-clamp-1 text-xs font-medium tracking-tight">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(item.price)} each
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator className="my-5" />

            <dl className="flex flex-col gap-3 text-sm">
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

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-6 w-full gap-2 rounded-full"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                  Placing order…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Place order · {formatCurrency(total)}
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              By placing your order, you agree to our terms &amp; privacy policy.
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
