import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  Trash2,
} from "lucide-react";
import { productService } from "@/services/products.service";
import { formatCurrency, titleCaseSlug } from "@/lib/format";
import { cn } from "@/lib/utils";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/shared/components/empty-state";
import { Reveal } from "@/shared/components/reveal";
import { ProductsToolbar } from "@/features/admin/components/products-toolbar";
import {
  StockBadge,
  StockIndicator,
} from "@/features/admin/components/stock-indicator";
import type { SortOption } from "@/types";

export const metadata: Metadata = {
  title: "Products",
};

const VALID_SORTS: SortOption[] = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "rating-desc",
  "title-asc",
];

const PAGE_SIZE = 20;

type SearchParams = {
  page?: string;
  sortBy?: string;
  q?: string;
};

/**
 * ProductsPage — server component that reads searchParams and renders the
 * catalog table.
 *
 * The toolbar (search/sort/export) is a client island; everything else
 * (table, pagination, empty state) is server-rendered. Row actions are
 * mock — View links to the storefront product page; Edit/Delete are
 * no-ops (a real admin would route to an edit page or open a dialog).
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const pageParam = Number(sp.page);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
  const sortBy: SortOption = VALID_SORTS.includes(sp.sortBy as SortOption)
    ? (sp.sortBy as SortOption)
    : "featured";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const result = await productService.getProducts({
    page,
    limit: PAGE_SIZE,
    sortBy,
    search: q || undefined,
  });

  const totalPages = result.totalPages;
  const currentPage = result.page;
  const showingFrom = result.total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, result.total);

  // Pagination hrefs preserve the current query params.
  const paginationHref = (targetPage: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (sortBy !== "featured") params.set("sortBy", sortBy);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Page header */}
      <Reveal>
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
            Catalog
          </span>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Products
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Browse, search, and manage every product in the Aurora catalog.
          </p>
        </div>
      </Reveal>

      {/* Toolbar */}
      <Reveal delay={0.04}>
        <ProductsToolbar
          total={result.total}
          page={currentPage}
          sortBy={sortBy}
          q={q}
        />
      </Reveal>

      {/* Table or empty state */}
      <Reveal delay={0.06}>
        {result.items.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={
              q
                ? `Nothing in the catalog matches "${q}". Try a different query.`
                : "The catalog is empty. Add a product to get started."
            }
            action={
              q ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/admin/products">Clear filters</Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Card className="overflow-hidden rounded-2xl p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-6 text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Product
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    SKU
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Price
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Stock
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Rating
                  </TableHead>
                  <TableHead className="text-[11px] uppercase tracking-luxe text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="px-6 text-right text-[11px] uppercase tracking-luxe text-muted-foreground">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((product) => (
                  <TableRow key={product.id} className="text-sm">
                    {/* Product (thumbnail + title + category) */}
                    <TableCell className="px-6">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={product.thumbnail}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="line-clamp-1 font-medium">
                            {product.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {titleCaseSlug(product.category)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* SKU */}
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {product.sku}
                    </TableCell>

                    {/* Price */}
                    <TableCell className="font-medium tabular-nums">
                      {formatCurrency(product.price)}
                    </TableCell>

                    {/* Stock */}
                    <TableCell>
                      <StockIndicator stock={product.stock} />
                    </TableCell>

                    {/* Rating */}
                    <TableCell className="tabular-nums text-muted-foreground">
                      {product.rating.toFixed(2)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StockBadge stock={product.stock} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={`Actions for ${product.title}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {product.title.length > 28
                              ? `${product.title.slice(0, 28)}…`
                              : product.title}
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination footer */}
            <div className="flex flex-col gap-3 border-t border-border/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {showingFrom.toLocaleString()}
                </span>
                –
                <span className="font-medium tabular-nums text-foreground">
                  {showingTo.toLocaleString()}
                </span>{" "}
                of{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {result.total.toLocaleString()}
                </span>
              </p>
              <div className="flex items-center gap-1">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1",
                    !result.hasPrev && "pointer-events-none opacity-40",
                  )}
                  aria-disabled={!result.hasPrev}
                >
                  <Link
                    href={paginationHref(Math.max(1, currentPage - 1))}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </Link>
                </Button>
                <span className="px-3 text-xs tabular-nums text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1",
                    !result.hasNext && "pointer-events-none opacity-40",
                  )}
                  aria-disabled={!result.hasNext}
                >
                  <Link
                    href={paginationHref(Math.min(totalPages, currentPage + 1))}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </Card>
        )}
      </Reveal>
    </div>
  );
}
