import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getSessionOrRefresh } from "@/lib/session";
import { ordersService } from "@/services/orders.service";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { OrderActions } from "@/features/account/components/order-actions";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderDto, OrderStatus } from "@/types";

/**
 * /account/orders/[id] — order detail.
 *
 * Server component. Fetches `ordersService.getById(id, userId)`, renders
 * status timeline + items + addresses + totals. The Reorder / Download
 * invoice / Cancel actions are delegated to the client `OrderActions`
 * island (it needs cart + dialog interactivity).
 */

export const metadata = {
  title: "Order details",
};

const TIMELINE_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Pending" },
  { status: "processing", label: "Processing" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

function stepIndex(status: OrderStatus): number {
  return TIMELINE_STEPS.findIndex((s) => s.status === status);
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function AddressBlock({
  title,
  addr,
}: {
  title: string;
  addr: Record<string, unknown>;
}) {
  const get = (k: string) =>
    typeof addr[k] === "string" ? (addr[k] as string) : null;
  const fullName = get("fullName");
  const line1 = get("line1");
  const line2 = get("line2");
  const city = get("city");
  const state = get("state");
  const zip = get("zip");
  const country = get("country");
  const phone = get("phone");
  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <h3 className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
        {title}
      </h3>
      {fullName && <span className="font-medium tracking-tight">{fullName}</span>}
      {line1 && <span className="text-muted-foreground">{line1}</span>}
      {line2 && <span className="text-muted-foreground">{line2}</span>}
      {(city || state || zip) && (
        <span className="text-muted-foreground">
          {city}
          {state ? `, ${state}` : ""} {zip}
        </span>
      )}
      {country && <span className="text-muted-foreground">{country}</span>}
      {phone && <span className="text-muted-foreground">{phone}</span>}
      {!fullName && !line1 && (
        <span className="text-muted-foreground">—</span>
      )}
    </div>
  );
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSessionOrRefresh();
  if (!session) return null;

  const { id } = await params;
  let order: OrderDto;
  try {
    const fetched = await ordersService.getById(id, session.id);
    order = fetched as unknown as OrderDto;
  } catch {
    notFound();
  }

  const isCancelled = order.status === "cancelled";
  const activeStep = isCancelled ? -1 : stepIndex(order.status);

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-3">
          <Eyebrow>Order</Eyebrow>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Order #{order.number}
              </h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <OrderStatusBadge status={order.status} />
                <span>·</span>
                <time dateTime={order.createdAt} title={order.createdAt}>
                  {formatFullDate(order.createdAt)}
                </time>
              </div>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Status timeline */}
      <Reveal delay={0.04}>
        <Card className="rounded-2xl border-border/60 p-6">
          <h2 className="text-base font-semibold tracking-tight">
            Order progress
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isCancelled
              ? "This order was cancelled. Items have been restocked."
              : "Track your order as it moves through fulfilment."}
          </p>
          <ol className="mt-6 flex flex-col gap-0 sm:flex-row sm:items-start">
            {TIMELINE_STEPS.map((step, i) => {
              const done = !isCancelled && i <= activeStep;
              const current = !isCancelled && i === activeStep;
              const isLast = i === TIMELINE_STEPS.length - 1;
              return (
                <li
                  key={step.status}
                  className="flex flex-1 flex-row items-start gap-3 sm:flex-col sm:items-start sm:gap-2"
                >
                  <div className="flex items-center gap-3 sm:w-full sm:flex-col sm:items-start">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors",
                        done
                          ? "bg-foreground text-background"
                          : "border border-border bg-card text-muted-foreground",
                        current && "ring-2 ring-foreground/20 ring-offset-2 ring-offset-background",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {!isLast && (
                      <span
                        className={cn(
                          "hidden h-px flex-1 bg-border sm:block",
                          !isCancelled && i < activeStep && "bg-foreground",
                        )}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-4 sm:pb-0">
                    <span
                      className={cn(
                        "text-sm font-medium",
                        done ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <span
                      className={cn(
                        "ml-5 h-px flex-1 bg-border sm:hidden",
                        !isCancelled && i < activeStep && "bg-foreground",
                      )}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </Card>
      </Reveal>

      {/* Items + addresses */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Items list — wider */}
        <Reveal className="lg:col-span-3" delay={0.06}>
          <Card className="flex h-full flex-col rounded-2xl p-0">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 p-6 pb-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold tracking-tight">
                  Items
                </h2>
                <p className="text-sm text-muted-foreground">
                  {order.items.length}{" "}
                  {order.items.length === 1 ? "line item" : "line items"}
                </p>
              </div>
            </div>
            <ul className="divide-y divide-border/60">
              {order.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 p-5">
                  <Link
                    href={`/products/${it.productId}`}
                    className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted"
                  >
                    <Image
                      src={it.thumbnail}
                      alt={it.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Link
                      href={`/products/${it.productId}`}
                      className="line-clamp-2 text-sm font-medium tracking-tight hover:underline"
                    >
                      {it.title}
                    </Link>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(it.price)} each · qty {it.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(it.price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </Reveal>

        {/* Addresses */}
        <Reveal className="lg:col-span-2" delay={0.08}>
          <Card className="flex h-full flex-col gap-5 rounded-2xl p-6">
            <AddressBlock title="Shipping address" addr={order.shippingAddress} />
            <Separator />
            <AddressBlock title="Billing address" addr={order.billingAddress} />
            <Separator />
            <div className="flex flex-col gap-1.5 text-sm">
              <h3 className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Payment
              </h3>
              <span className="font-medium tracking-tight capitalize">
                {order.paymentMethod === "cod"
                  ? "Cash on delivery"
                  : order.paymentMethod === "paypal"
                    ? "PayPal"
                    : "Card"}
              </span>
              <span className="text-xs text-muted-foreground capitalize">
                Shipping:{" "}
                {order.shippingMethod === "express"
                  ? "Express (1-2 days)"
                  : "Standard (3-5 days)"}
              </span>
            </div>
          </Card>
        </Reveal>
      </div>

      {/* Totals + actions */}
      <Reveal delay={0.1}>
        <Card className="rounded-2xl border-border/60 p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold tracking-tight">
                Summary
              </h2>
              <p className="text-sm text-muted-foreground">
                Order totals and any applied coupon.
              </p>
            </div>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(order.subtotal)}
                </dd>
              </div>
              {order.discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Discount{" "}
                    {order.couponCode && (
                      <span className="font-mono text-xs">
                        ({order.couponCode})
                      </span>
                    )}
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    −{formatCurrency(order.discount)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="font-medium tabular-nums">
                  {order.shipping === 0 ? "Free" : formatCurrency(order.shipping)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(order.tax)}
                </dd>
              </div>
              <Separator className="my-1" />
              <div className="flex items-baseline justify-between">
                <dt className="text-sm font-medium">Total</dt>
                <dd className="text-xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(order.total)}
                </dd>
              </div>
            </dl>
          </div>

          <Separator className="my-6" />

          <OrderActions order={order} />
        </Card>
      </Reveal>
    </div>
  );
}
