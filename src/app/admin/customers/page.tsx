import type { Metadata } from "next";
import * as React from "react";
import { PackageSearch, Search, Users } from "lucide-react";
import { adminService } from "@/services/admin.service";
import { formatCurrency, timeAgo } from "@/lib/format";
import { Reveal } from "@/shared/components/reveal";
import { EmptyState } from "@/shared/components/empty-state";
import { Card } from "@/components/ui/card";
import { CustomerDetailDialog } from "@/features/admin/components/customer-detail-dialog";
import { CustomersToolbar } from "@/features/admin/components/customers-toolbar";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const metadata: Metadata = {
  title: "Customers",
};

/**
 * /admin/customers — server component.
 *
 * Fetches paginated customers with order stats via `adminService.getCustomers`
 * (real DB aggregate: totalSpent + orderCount per customer). Search + pagination
 * are URL-driven. Row click opens a client dialog with the full order history.
 */
export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim() || undefined;

  const result = await adminService.getCustomers({
    page,
    limit: 20,
    search: q,
  });

  const customers = result.items;
  const totalPages = Math.max(1, Math.ceil(result.total / 20));

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              People
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Customers
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Everyone who&apos;s created an account. Click a row to see their
              order history.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                Total
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {result.total}
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.04}>
        <CustomersToolbar initialQuery={q ?? ""} />
      </Reveal>

      <Reveal delay={0.06}>
        {customers.length === 0 ? (
          <EmptyState
            icon={q ? Search : Users}
            title={q ? "No matching customers" : "No customers yet"}
            description={
              q
                ? `No customers match "${q}". Try a different search.`
                : "Registered customers will appear here."
            }
          />
        ) : (
          <Card className="overflow-hidden rounded-2xl p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left">
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                      Total spent
                    </th>
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                      Joined
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {customers.map((c) => {
                    const initials = (c.name ?? c.email)
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <tr
                        key={c.id}
                        className="group transition-colors hover:bg-accent/40"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={c.avatar ?? undefined} alt="" />
                              <AvatarFallback className="text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex min-w-0 flex-col">
                              <span className="truncate font-medium tracking-tight">
                                {c.name ?? "Unnamed"}
                              </span>
                              <span className="truncate text-xs text-muted-foreground">
                                {c.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 tabular-nums">
                          {c.orderCount}
                        </td>
                        <td className="px-6 py-4 font-medium tabular-nums">
                          {formatCurrency(c.totalSpent)}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                          {timeAgo(c.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <CustomerDetailDialog customerId={c.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </Reveal>

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/customers"
          searchParams={q ? { q } : undefined}
        />
      )}
    </div>
  );
}
