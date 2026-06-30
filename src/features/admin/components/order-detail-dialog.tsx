"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Loader2,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { OrderDto, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_ACTIONS: {
  status: OrderStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { status: "processing", label: "Mark processing", icon: PackageCheck },
  { status: "shipped", label: "Mark shipped", icon: Truck },
  { status: "delivered", label: "Mark delivered", icon: Check },
];

/**
 * OrderDetailDialog — admin order detail with status management.
 *
 * Opens via a "View" trigger. Shows the full order (items, addresses, totals,
 * coupon) and action buttons to advance the status. Cancel uses a
 * confirmation AlertDialog (it restocks inventory server-side).
 * On any status change: PATCH `/api/orders/[id]/status`, toast, and
 * `router.refresh()` so the server table re-renders with fresh data.
 */
export function OrderDetailDialog({ order }: { order: OrderDto }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [updating, setUpdating] = React.useState<OrderStatus | null>(null);

  const updateStatus = async (status: OrderStatus) => {
    setUpdating(status);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to update status");
      }
      toast.success(`Order marked as ${status}`);
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update status");
    } finally {
      setUpdating(null);
    }
  };

  const shipAddr = order.shippingAddress as Record<string, string>;
  const billAddr = order.billingAddress as Record<string, string>;
  const isCancelled = order.status === "cancelled";
  const isDelivered = order.status === "delivered";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`View order ${order.number}`}
        >
          View
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Order #{order.number}
            <OrderStatusBadge status={order.status} />
          </DialogTitle>
          <DialogDescription>
            Placed {timeAgo(order.createdAt)} · {order.customerName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          {/* Status timeline */}
          <div className="flex items-center justify-between gap-2">
            {(["pending", "processing", "shipped", "delivered"] as OrderStatus[]).map(
              (step, i, arr) => {
                const reached =
                  order.status === step ||
                  (order.status === "cancelled" ? false : true);
                const orderWeight: Record<string, number> = {
                  pending: 0,
                  processing: 1,
                  shipped: 2,
                  delivered: 3,
                  cancelled: -1,
                };
                const current = orderWeight[order.status];
                const stepWeight = orderWeight[step];
                const active = !isCancelled && stepWeight <= current;
                return (
                  <React.Fragment key={step}>
                    <div className="flex flex-col items-center gap-1.5">
                      <motion.div
                        initial={false}
                        animate={{
                          backgroundColor: active
                            ? "var(--foreground)"
                            : "var(--muted)",
                          color: active
                            ? "var(--background)"
                            : "var(--muted-foreground)",
                        }}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums",
                        )}
                      >
                        {i + 1}
                      </motion.div>
                      <span
                        className={cn(
                          "text-[10px] uppercase tracking-wider",
                          active
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {step}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div
                        className={cn(
                          "h-px flex-1",
                          active && stepWeight < current
                            ? "bg-foreground"
                            : "bg-border",
                        )}
                      />
                    )}
                  </React.Fragment>
                );
              },
            )}
          </div>

          {/* Items */}
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold tracking-tight">Items</h3>
            <ul className="flex flex-col gap-2">
              {order.items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={it.thumbnail}
                      alt={it.title}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-1 text-sm font-medium">
                      {it.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(it.price)} × {it.quantity}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(it.price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                Shipping address
              </h3>
              <div className="rounded-xl border border-border/60 p-3 text-sm">
                <p className="font-medium">{shipAddr.fullName || order.customerName}</p>
                <p className="text-muted-foreground">{shipAddr.line1 || shipAddr.address}</p>
                {shipAddr.line2 && (
                  <p className="text-muted-foreground">{shipAddr.line2}</p>
                )}
                <p className="text-muted-foreground">
                  {shipAddr.city}
                  {shipAddr.state ? `, ${shipAddr.state}` : ""} {shipAddr.zip}
                </p>
                <p className="text-muted-foreground">{shipAddr.country}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold tracking-tight">
                Billing address
              </h3>
              <div className="rounded-xl border border-border/60 p-3 text-sm">
                {billAddr && Object.keys(billAddr).length > 0 ? (
                  <>
                    <p className="font-medium">{billAddr.fullName || order.customerName}</p>
                    <p className="text-muted-foreground">{billAddr.line1 || billAddr.address}</p>
                    <p className="text-muted-foreground">
                      {billAddr.city}
                      {billAddr.state ? `, ${billAddr.state}` : ""} {billAddr.zip}
                    </p>
                    <p className="text-muted-foreground">{billAddr.country}</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Same as shipping</p>
                )}
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-xl border border-border/60 p-4">
            <div className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Discount{order.couponCode ? ` (${order.couponCode})` : ""}
                  </span>
                  <span className="tabular-nums text-foreground">
                    −{formatCurrency(order.discount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="tabular-nums">
                  {order.shipping === 0 ? "Free" : formatCurrency(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span className="tabular-nums">{formatCurrency(order.tax)}</span>
              </div>
              <Separator className="my-1.5" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(order.total)}</span>
              </div>
              <div className="flex justify-between pt-1 text-xs text-muted-foreground">
                <span>Payment</span>
                <span className="capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Shipping method</span>
                <span className="capitalize">{order.shippingMethod}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {!isCancelled && !isDelivered && (
            <>
              <Separator />
              <div className="flex flex-wrap items-center gap-2">
                {STATUS_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  // Don't show actions for statuses already passed.
                  const orderWeight: Record<string, number> = {
                    pending: 0,
                    processing: 1,
                    shipped: 2,
                    delivered: 3,
                  };
                  if (orderWeight[action.status] <= orderWeight[order.status])
                    return null;
                  return (
                    <Button
                      key={action.status}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-full"
                      disabled={updating !== null}
                      onClick={() => updateStatus(action.status)}
                    >
                      {updating === action.status ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5" />
                      )}
                      {action.label}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-auto gap-1.5 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={updating !== null}
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel order
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The order will be marked as cancelled and the items restocked.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep order</AlertDialogCancel>
            <AlertDialogAction
              disabled={updating !== null}
              onClick={() => updateStatus("cancelled")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updating === "cancelled" && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
