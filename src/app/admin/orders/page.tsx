import type { Metadata } from "next";
import * as React from "react";
import { adminService } from "@/services/admin.service";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "@/shared/components/reveal";
import { OrdersTable } from "@/features/admin/components/orders-table";

export const metadata: Metadata = {
  title: "Orders",
};

/**
 * OrdersPage — server component that fetches the recent orders and hands
 * them to the `OrdersTable` client island for filtering/searching.
 *
 * The underlying mock service returns 8 orders; the client table handles
 * status-filter tabs + free-text search without a round-trip, which keeps
 * the experience responsive for a demo dataset.
 */
export default async function OrdersPage() {
  const orders = await adminService.getRecentOrders();

  // Summary stats for the page header.
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const openOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "processing",
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Page header */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Fulfilment
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Orders
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Track and manage every order flowing through the storefront.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Volume
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {orders.length}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Open
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {openOrders}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Value
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      {/* Orders table */}
      <Reveal delay={0.05}>
        <OrdersTable orders={orders} />
      </Reveal>
    </div>
  );
}
