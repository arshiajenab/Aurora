"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, timeAgo } from "@/lib/format";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { OrderDetailDialog } from "@/features/admin/components/order-detail-dialog";
import type { OrderDto, OrderStatus } from "@/types";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * OrdersAdminTable — client island for the admin orders page.
 *
 * Responsibilities:
 *  - Status filter tabs (URL-driven via `?status=`).
 *  - Debounced search (URL-driven via `?q=`).
 *  - Row click → OrderDetailDialog with status management.
 *
 * The parent server component re-fetches on URL change, so this component
 * never holds the data itself — it just renders + dispatches URL updates.
 */
export function OrdersAdminTable({ orders }: { orders: OrderDto[] }) {
  const router = useRouter();
  const params = useSearchParams();

  const currentStatus = params?.get("status") ?? "all";
  const currentQuery = params?.get("q") ?? "";

  const [search, setSearch] = React.useState(currentQuery);
  React.useEffect(() => {
    setSearch(currentQuery);
  }, [currentQuery]);

  const updateParams = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      for (const [k, v] of Object.entries(updates)) {
        if (v && v !== "all") next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `/admin/orders?${qs}` : "/admin/orders");
    },
    [router, params],
  );

  // Debounced search → URL.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() !== currentQuery) {
        updateParams({ q: search.trim() || undefined, page: undefined });
      }
    }, 240);
    return () => clearTimeout(handle);
  }, [search, currentQuery, updateParams]);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={currentStatus}
          onValueChange={(v) => updateParams({ status: v, page: undefined })}
        >
          <TabsList className="h-9 rounded-full bg-muted p-1">
            {STATUS_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="rounded-full px-3 text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders…"
            className="h-9 rounded-full pl-9 pr-9"
            aria-label="Search orders"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Order
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Customer
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Total
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {orders.map((order) => {
                const itemCount = order.items.reduce(
                  (s, i) => s + i.quantity,
                  0,
                );
                return (
                  <tr
                    key={order.id}
                    className="group cursor-pointer transition-colors hover:bg-accent/40"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
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
                        <div className="flex flex-col">
                          <span className="font-medium tracking-tight">
                            #{order.number}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customerName}</span>
                        <span className="text-xs text-muted-foreground">
                          {order.customerEmail}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {timeAgo(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <OrderDetailDialog order={order} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
