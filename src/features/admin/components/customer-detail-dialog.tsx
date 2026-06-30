"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronRight, Loader2, Mail, Phone, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { OrderDto } from "@/types";

interface CustomerDetail {
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
    avatar: string | null;
    role: string;
    createdAt: string;
  };
  orders: { items: OrderDto[]; total: number };
}

/**
 * CustomerDetailDialog — opens on row click, fetches the customer's profile
 * + full order history from `/api/admin/customers/[id]`.
 */
export function CustomerDetailDialog({ customerId }: { customerId: string }) {
  const [open, setOpen] = React.useState(false);
  const [detail, setDetail] = React.useState<CustomerDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      if (!res.ok) throw new Error("Failed to load customer");
      const data = (await res.json()) as CustomerDetail;
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  React.useEffect(() => {
    if (open) load();
  }, [open, load]);

  const user = detail?.user;
  const orders = detail?.orders.items ?? [];
  const totalSpent = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total, 0);
  const initials = (user?.name ?? user?.email ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-label="View customer detail"
        >
          View
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customer detail</DialogTitle>
          <DialogDescription>
            Profile and order history for this customer.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !detail || !user ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Could not load customer details.
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Profile */}
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user.avatar ?? undefined} alt="" />
                <AvatarFallback className="text-base">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <span className="text-base font-semibold tracking-tight">
                  {user.name ?? "Unnamed"}
                </span>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </span>
                  {user.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {user.phone}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Joined {timeAgo(user.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/60 p-4">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Orders
                </span>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {detail.orders.total}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Total spent
                </span>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 p-4">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Avg. order
                </span>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {orders.length > 0
                    ? formatCurrency(totalSpent / orders.length)
                    : formatCurrency(0)}
                </p>
              </div>
            </div>

            <Separator />

            {/* Order history */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold tracking-tight">
                Order history
              </h3>
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No orders placed yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {orders.map((order) => {
                    const itemCount = order.items.reduce(
                      (s, i) => s + i.quantity,
                      0,
                    );
                    return (
                      <li
                        key={order.id}
                        className="flex items-center gap-3 rounded-xl border border-border/60 p-3"
                      >
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 2).map((it) => (
                            <span
                              key={it.id}
                              className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-muted"
                            >
                              <Image
                                src={it.thumbnail}
                                alt=""
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            </span>
                          ))}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              #{order.number}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                            {timeAgo(order.createdAt)}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">
                          {formatCurrency(order.total)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
