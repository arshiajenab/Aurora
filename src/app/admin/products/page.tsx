import type { Metadata } from "next";
import * as React from "react";
import { PackageSearch } from "lucide-react";
import { productService } from "@/services/products.service";
import { formatCurrency } from "@/lib/format";
import { Reveal } from "@/shared/components/reveal";
import { EmptyState } from "@/shared/components/empty-state";
import { ProductsAdminTable } from "@/features/admin/components/products-admin-table";
import type { SortOption } from "@/types";

export const metadata: Metadata = {
  title: "Products",
};

/**
 * /admin/products — server component.
 *
 * Fetches products via `productService.listAllForAdmin` (real DB data) and
 * categories in parallel. Search/filter/sort/pagination are URL-driven; the
 * `ProductsAdminTable` client island renders the toolbar + table + CRUD
 * dialogs.
 */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    category?: string;
    status?: string;
    sortBy?: string;
  }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const q = sp.q?.trim() || undefined;
  const category = sp.category && sp.category !== "all" ? sp.category : undefined;
  const status = sp.status && sp.status !== "all" ? sp.status : undefined;
  const sortBy = (sp.sortBy as SortOption) ?? "newest";

  const [result, categories] = await Promise.all([
    productService.listAllForAdmin({ page, limit: 20, search: q, category, status }),
    productService.getCategories().catch(() => []),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
              Catalog
            </span>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Products
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Create, edit, and manage every product in the catalog.
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

      <Reveal delay={0.05}>
        {result.items.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description="Try adjusting your filters, or create a new product to get started."
          />
        ) : (
          <ProductsAdminTable
            products={result.items}
            total={result.total}
            page={page}
            totalPages={result.totalPages}
            categories={categories}
            currentCategory={category ?? ""}
            currentStatus={status ?? ""}
            currentSort={sortBy}
            currentQuery={q ?? ""}
          />
        )}
      </Reveal>
    </div>
  );
}
