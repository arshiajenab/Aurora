import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, AlertTriangle, PackageX } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { productService } from "@/services/products.service";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  timeAgo,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "@/shared/components/reveal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { KpiGrid } from "@/features/admin/components/kpi-grid";
import { RevenueChart } from "@/features/admin/components/revenue-chart";
import {
  InventoryChart,
  InventoryLegend,
  type InventoryDatum,
} from "@/features/admin/components/inventory-chart";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";

/**
 * Dashboard — the admin landing page.
 *
 * Server component. All four data fetches run in parallel via `Promise.all`
 * so the TTFB stays low. Chart islands are client components; everything
 * else (KPI tiles, tables, inventory legend) is server-rendered.
 */

export default async function AdminDashboardPage() {
  const [kpis, revenueSeries, recentOrders, inventory] = await Promise.all([
    adminService.getKpis(),
    adminService.getRevenueSeries(),
    adminService.getRecentOrders(),
    adminService.getInventory(),
  ]);

  // Inventory chart data — composed server-side, passed to the client chart.
  const inventoryData: InventoryDatum[] = [
    {
      key: "inStock",
      label: "In stock",
      value: inventory.inStock,
      color: "var(--chart-1)",
    },
    {
      key: "lowStock",
      label: "Low stock",
      value: inventory.lowStock,
      color: "var(--chart-2)",
    },
    {
      key: "outOfStock",
      label: "Out of stock",
      value: inventory.outOfStock,
      color: "var(--destructive)",
    },
  ];

  // Revenue stats for the chart card header.
  const totalRevenue = revenueSeries.reduce((sum, p) => sum + p.revenue, 0);
  const avgRevenue = totalRevenue / revenueSeries.length;
  const totalOrdersFromSeries = revenueSeries.reduce(
    (sum, p) => sum + p.orders,
    0,
  );

  // Orders-by-status counts for the small stat row.
  const statusCounts = recentOrders.reduce<Record<string, number>>(
    (acc, order) => {
      acc[order.status] = (acc[order.status] ?? 0) + 1;
      return acc;
    },
    {},
  );
  const statusRows: { status: string; count: number }[] = [
    { status: "Delivered", count: statusCounts.delivered ?? 0 },
    { status: "Processing", count: statusCounts.processing ?? 0 },
    { status: "Shipped", count: statusCounts.shipped ?? 0 },
    { status: "Pending", count: statusCounts.pending ?? 0 },
    { status: "Cancelled", count: statusCounts.cancelled ?? 0 },
  ];

  // Pull a few low-stock warnings from the live catalog for the side panel.
  const catalogPage = await productService.getProducts({ page: 1, limit: 30 });
  const lowStockWarnings = catalogPage.items
    .filter((p) => p.stock > 0 && p.stock < 20)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6 lg:p-8">
      {/* Page header */}
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Overview
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Dashboard
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              A snapshot of revenue, fulfilment, and inventory across the last
              reporting cycle.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
            Last 12 months
          </div>
        </div>
      </Reveal>

      {/* KPI cards */}
      <KpiGrid kpis={kpis} />

      {/* Revenue chart */}
      <Reveal delay={0.05}>
        <Card className="overflow-hidden rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold tracking-tight">
                Revenue
              </h2>
              <p className="text-sm text-muted-foreground">
                Monthly gross revenue over the trailing 12 months.
              </p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Total
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCompactCurrency(totalRevenue)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Avg / mo
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatCompactCurrency(avgRevenue)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Orders
                </span>
                <span className="text-lg font-semibold tabular-nums">
                  {formatNumber(totalOrdersFromSeries)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <RevenueChart data={revenueSeries} />
          </div>
        </Card>
      </Reveal>

      {/* Recent orders + inventory two-column */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent orders — wider */}
        <Reveal className="lg:col-span-3" delay={0.05}>
          <Card className="flex h-full flex-col rounded-2xl p-0">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 p-6 pb-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold tracking-tight">
                  Recent orders
                </h2>
                <p className="text-sm text-muted-foreground">
                  The latest {recentOrders.length} orders across the storefront.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Link href="/admin/orders">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
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
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="px-6 text-right text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.slice(0, 6).map((order) => (
                  <TableRow key={order.id} className="text-sm">
                    <TableCell className="px-6 font-mono text-xs text-muted-foreground">
                      {order.id}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customer.fullName}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {timeAgo(order.createdAt)}
                    </TableCell>
                    <TableCell className="px-6 text-right font-medium tabular-nums">
                      {formatCurrency(order.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Reveal>

        {/* Inventory status */}
        <Reveal className="lg:col-span-2" delay={0.1}>
          <Card className="flex h-full flex-col gap-6 rounded-2xl p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold tracking-tight">
                Inventory health
              </h2>
              <p className="text-sm text-muted-foreground">
                Current stock distribution across the catalog.
              </p>
            </div>

            <InventoryChart
              data={inventoryData}
              total={inventory.total}
            />

            <InventoryLegend data={inventoryData} />

            {lowStockWarnings.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-border/60 pt-5">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-luxe text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Low-stock warnings
                </div>
                <ul className="flex flex-col gap-2">
                  {lowStockWarnings.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={p.thumbnail}
                          alt=""
                          fill
                          sizes="32px"
                          className="object-cover"
                        />
                      </div>
                      <span className="line-clamp-1 flex-1 font-medium">
                        {p.title}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-muted-foreground">
                        {p.stock} left
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {inventory.outOfStock > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                <PackageX className="h-3.5 w-3.5" />
                {inventory.outOfStock} product
                {inventory.outOfStock === 1 ? "" : "s"} out of stock.
              </div>
            )}
          </Card>
        </Reveal>
      </div>

      {/* Orders-by-status strip */}
      <Reveal delay={0.05}>
        <Card className="rounded-2xl p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold tracking-tight">
              Orders by status
            </h2>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Link href="/admin/orders">
                Manage orders
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {statusRows.map((row) => (
              <div
                key={row.status}
                className={cn(
                  "flex flex-col gap-1 rounded-xl border border-border/60 bg-card/50 p-4",
                )}
              >
                <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  {row.status}
                </span>
                <span className="text-xl font-semibold tabular-nums">
                  {row.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
