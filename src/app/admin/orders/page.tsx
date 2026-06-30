import type { Metadata } from "next";
import * as React from "react";
import { adminService } from "@/services/admin.service";
import { ordersService } from "@/services/orders.service";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "@/shared/components/reveal";
import { OrdersAdminTable } from "@/features/admin/components/orders-admin-table";
import { EmptyState } from "@/shared/components/empty-state";
import { Search } from "lucide-react";
import type { OrderDto } from "@/types";

export const metadata: Metadata = {
  title: "Orders",
};

/**
 * /admin/orders — server component.
 *
 * Fetches ALL orders via `ordersService.listForAdmin` (real DB data, not the
 * 8-item mock). Search + status filter + pagination are URL-driven. The
 * `OrdersAdminTable` client island handles row-click → detail dialog with
 * status updates, plus the status filter tabs + search.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const status = sp.status && sp.status !== "all" ? sp.status : undefined;
  const q = sp.q?.trim() || undefined;

  // Real orders + dashboard KPIs in parallel.
  const [result, kpis] = await Promise.all([
    ordersService.listForAdmin({ page, limit: 20, status, search: q }),
    adminService.getKpis().catch(() => []),
  ]);

  const orders = result.items as unknown as OrderDto[];
  const totalPages = result.totalPages;

  // Summary stats derived from KPIs (real aggregates).
  const totalRevenue = Number(
    kpis.find((k) => k.label === "Total Revenue")?.value?.replace(/[^0-9.]/g, "") ??
      "0",
  );
  const pendingOrders = Number(
    kpis.find((k) => k.label === "Pending Orders")?.value ?? "0",
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
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
                {result.total}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Pending
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {pendingOrders}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Revenue
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.05}>
        {orders.length === 0 ? (
          <EmptyState
            icon={q ? Search : undefined}
            title={q ? "No matching orders" : "No orders yet"}
            description={
              q
                ? `No orders match your search. Try a different query.`
                : "Orders placed on the storefront will appear here."
            }
          />
        ) : (
          <OrdersAdminTable orders={orders} />
        )}
      </Reveal>
    </div>
  );
}
