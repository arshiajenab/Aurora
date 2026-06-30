import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Package, Search } from "lucide-react";
import { getSessionOrRefresh } from "@/lib/session";
import { ordersService } from "@/services/orders.service";
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
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { EmptyState } from "@/shared/components/empty-state";
import { formatCurrency, timeAgo } from "@/lib/format";
import type { OrderDto, OrderStatus } from "@/types";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/**
 * /account/orders — paginated list of the user's orders.
 *
 * Server component. Reads `page` + `status` from searchParams, fetches via
 * `ordersService.listForUser`, renders a table. Each row links to the
 * detail page.
 */

export const metadata = {
  title: "Orders",
};

const PAGE_SIZE = 10;

const STATUS_FILTERS: { value: "all" | OrderStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function buildPaginationHref(
  page: number,
  status: string,
  basePath: string,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (status && status !== "all") params.set("status", status);
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function AccountOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const session = await getSessionOrRefresh();
  if (!session) return null;

  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const status = sp.status ?? "all";

  const result = await ordersService.listForUser(session.id, {
    page,
    limit: PAGE_SIZE,
    status: status === "all" ? undefined : status,
  });
  const orders = result.items as unknown as OrderDto[];

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2">
          <Eyebrow>Account</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Orders
          </h1>
          <p className="text-sm text-muted-foreground">
            Track and review every order you&apos;ve placed.
          </p>
        </div>
      </Reveal>

      {/* Status filter pills (link-based so it works without client JS) */}
      <Reveal delay={0.04}>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            const params = new URLSearchParams();
            if (f.value !== "all") params.set("status", f.value);
            const qs = params.toString();
            const href = qs ? `/account/orders?${qs}` : "/account/orders";
            return (
              <Link
                key={f.value}
                href={href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-xs font-medium text-background"
                    : "inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                }
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </Reveal>

      {orders.length === 0 ? (
        <Reveal delay={0.06}>
          <EmptyState
            icon={Package}
            title="No orders found"
            description={
              status === "all"
                ? "When you place your first order, it'll appear here."
                : "Try adjusting the status filter."
            }
            action={
              <Button asChild className="rounded-full">
                <Link href="/products">Browse the catalog</Link>
              </Button>
            }
          />
        </Reveal>
      ) : (
        <Reveal delay={0.06}>
          <Card className="overflow-hidden rounded-2xl p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Order
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Items
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
                {orders.map((order) => {
                  const itemCount = order.items.reduce(
                    (sum, i) => sum + i.quantity,
                    0,
                  );
                  return (
                    <TableRow key={order.id} className="text-sm">
                      <TableCell className="px-6">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="font-mono text-xs font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          #{order.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex -space-x-2">
                            {order.items.slice(0, 3).map((it) => (
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
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {itemCount}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <time dateTime={order.createdAt} title={order.createdAt}>
                          {timeAgo(order.createdAt)}
                        </time>
                      </TableCell>
                      <TableCell className="px-6 text-right font-medium tabular-nums">
                        {formatCurrency(order.total)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </Reveal>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href={
                    page > 1
                      ? buildPaginationHref(page - 1, status, "/account/orders")
                      : "#"
                  }
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                />
              </PaginationItem>
              {Array.from({ length: result.totalPages }).map((_, i) => {
                const p = i + 1;
                // Show only the pages near the current one to keep the bar tidy.
                if (
                  Math.abs(p - page) > 2 &&
                  p !== 1 &&
                  p !== result.totalPages
                )
                  return null;
                return (
                  <PaginationItem key={p}>
                    <PaginationLink
                      href={buildPaginationHref(p, status, "/account/orders")}
                      isActive={p === page}
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  href={
                    page < result.totalPages
                      ? buildPaginationHref(page + 1, status, "/account/orders")
                      : "#"
                  }
                  aria-disabled={page >= result.totalPages}
                  className={
                    page >= result.totalPages
                      ? "pointer-events-none opacity-40"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className="flex justify-center">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-full text-muted-foreground"
        >
          <Link href="/products">
            <Search className="h-3.5 w-3.5" />
            Continue shopping
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
