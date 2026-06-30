import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  MapPin,
  Package,
  Wallet,
} from "lucide-react";
import { getSessionOrRefresh } from "@/lib/session";
import { ordersService } from "@/services/orders.service";
import { addressesService } from "@/services/addresses.service";
import { wishlistService } from "@/services/wishlist.service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { OrderStatusBadge } from "@/features/admin/components/order-status-badge";
import { formatCurrency, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderDto } from "@/types";

/**
 * /account — dashboard.
 *
 * Server component. Fetches the session, then the user's orders, addresses,
 * and wishlist ids (in parallel). Renders a "Welcome back" header, four KPI
 * stat cards, recent orders, and quick links.
 *
 * All motion-heavy children are server-rendered (no `motion.*` directly here).
 */

export const metadata = {
  title: "Dashboard",
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const Wrapper: React.ElementType = href ? Link : "div";
  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-border",
        href && "cursor-pointer",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
          {label}
        </span>
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {value}
        </span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
    </Wrapper>
  );
}

export default async function AccountDashboardPage() {
  const session = await getSessionOrRefresh();
  // Middleware should have bounced unauth'd users; defensive null check.
  if (!session) return null;

  const userId = session.id;

  const [recentResult, allOrdersResult, addresses, wishlistIds] =
    await Promise.all([
      ordersService.listForUser(userId, { page: 1, limit: 5 }),
      ordersService.listForUser(userId, { page: 1, limit: 100 }),
      addressesService.list(userId),
      wishlistService.listIds(userId).catch(() => [] as number[]),
    ]);

  const recentOrders: OrderDto[] = recentResult.items as unknown as OrderDto[];

  // Lifetime totals — sum totals across all non-cancelled orders.
  const lifetimeSpent = (allOrdersResult.items as unknown as OrderDto[])
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const totalOrdersCount = allOrdersResult.total;
  const wishlistCount = wishlistIds.length;
  const addressesCount = addresses.length;

  const displayName = session.name ?? session.email.split("@")[0];

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2">
          <Eyebrow>Account</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            A snapshot of your recent activity and saved items.
          </p>
        </div>
      </Reveal>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delay={0.02}>
          <StatCard
            icon={Package}
            label="Total orders"
            value={totalOrdersCount}
            hint={`${totalOrdersCount === 1 ? "order" : "orders"} placed`}
            href="/account/orders"
          />
        </Reveal>
        <Reveal delay={0.04}>
          <StatCard
            icon={Wallet}
            label="Total spent"
            value={formatCurrency(lifetimeSpent)}
            hint="Across non-cancelled orders"
            href="/account/orders"
          />
        </Reveal>
        <Reveal delay={0.06}>
          <StatCard
            icon={Heart}
            label="Wishlist"
            value={wishlistCount}
            hint={`${wishlistCount === 1 ? "item" : "items"} saved`}
            href="/account/wishlist"
          />
        </Reveal>
        <Reveal delay={0.08}>
          <StatCard
            icon={MapPin}
            label="Addresses"
            value={addressesCount}
            hint={`${addressesCount === 1 ? "address" : "addresses"} saved`}
            href="/account/addresses"
          />
        </Reveal>
      </div>

      {/* Recent orders + quick links */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent orders — wider */}
        <Reveal className="lg:col-span-3" delay={0.04}>
          <Card className="flex h-full flex-col rounded-2xl p-0">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 p-6 pb-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold tracking-tight">
                  Recent orders
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your last {recentOrders.length}{" "}
                  {recentOrders.length === 1 ? "order" : "orders"}.
                </p>
              </div>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <Link href="/account/orders">
                  View all
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
            {recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
                <Package className="h-8 w-8 text-muted-foreground/60" />
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium">No orders yet</p>
                  <p className="text-xs text-muted-foreground">
                    When you place your first order, it&apos;ll appear here.
                  </p>
                </div>
                <Button asChild size="sm" className="rounded-full">
                  <Link href="/products">Browse the catalog</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {recentOrders.map((order) => {
                  const itemCount = order.items.reduce(
                    (sum, i) => sum + i.quantity,
                    0,
                  );
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/account/orders/${order.id}`}
                        className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 3).map((it) => (
                            <span
                              key={it.id}
                              className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-background bg-muted"
                            >
                              <Image
                                src={it.thumbnail}
                                alt=""
                                fill
                                sizes="36px"
                                className="object-cover"
                              />
                            </span>
                          ))}
                          {itemCount > 3 && (
                            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                              +{itemCount - 3}
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tracking-tight">
                              Order #{order.number}
                            </span>
                            <OrderStatusBadge status={order.status} />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"} ·{" "}
                            <time dateTime={order.createdAt}>
                              {timeAgo(order.createdAt)}
                            </time>
                          </span>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(order.total)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </Reveal>

        {/* Quick links */}
        <Reveal className="lg:col-span-2" delay={0.06}>
          <Card className="flex h-full flex-col gap-4 rounded-2xl p-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold tracking-tight">
                Quick links
              </h2>
              <p className="text-sm text-muted-foreground">
                Jump to the area you need.
              </p>
            </div>
            <Separator />
            <ul className="flex flex-col gap-1">
              {[
                { href: "/account/orders", label: "My orders", icon: Package },
                { href: "/account/wishlist", label: "Wishlist", icon: Heart },
                {
                  href: "/account/addresses",
                  label: "Saved addresses",
                  icon: MapPin,
                },
                {
                  href: "/account/profile",
                  label: "Edit profile",
                  icon: Wallet,
                },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                      <span className="flex-1 font-medium tracking-tight">
                        {link.label}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
