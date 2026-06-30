"use client";

import * as React from "react";
import { Search, X, Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/shared/components/empty-state";
import { formatCurrency, timeAgo, truncate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";

/**
 * OrdersTable — client component that owns the status-filter tabs + search
 * input and renders the filtered order rows.
 *
 * The parent (orders page) fetches the orders server-side; this component
 * filters them client-side so switching tabs feels instant. We use the
 * shadcn `Tabs` (radix) which gives us keyboard nav for free.
 */

type FilterStatus = "all" | OrderStatus;

const FILTER_TABS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export function OrdersTable({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = React.useState<FilterStatus>("all");
  const [query, setQuery] = React.useState("");

  // Counts per status for the tab badges.
  const counts = React.useMemo(() => {
    const base: Record<FilterStatus, number> = {
      all: orders.length,
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of orders) base[o.status]++;
    return base;
  }, [orders]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer.fullName.toLowerCase().includes(q) ||
        o.customer.email.toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterStatus)}
        >
          <TabsList className="h-9 w-fit flex-wrap overflow-x-auto">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5"
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[10px] tabular-nums",
                    filter === tab.value
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {counts[tab.value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative w-full lg:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by order, customer, email…"
            className="h-9 w-full pl-8 pr-8 text-sm"
            aria-label="Search orders"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No orders match"
          description="Try adjusting the status filter or clearing your search query."
          className="bg-card"
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-6 text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Order
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Customer
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Items
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Total
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Status
                </TableHead>
                <TableHead className="px-6 text-[11px] uppercase tracking-luxe text-muted-foreground">
                  Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => {
                const itemCount = order.items.reduce(
                  (sum, i) => sum + i.quantity,
                  0,
                );
                const itemSummary = order.items
                  .map((i) => i.title)
                  .join(", ");
                return (
                  <TableRow key={order.id} className="text-sm">
                    <TableCell className="px-6 font-mono text-xs text-muted-foreground">
                      {order.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">
                          {order.customer.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {truncate(order.customer.email, 32)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="tabular-nums">{itemCount}</span>
                        <span
                          className="max-w-[180px] truncate text-xs text-muted-foreground"
                          title={itemSummary}
                        >
                          {itemSummary}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="px-6 text-muted-foreground">
                      <time dateTime={order.createdAt} title={order.createdAt}>
                        {timeAgo(order.createdAt)}
                      </time>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
