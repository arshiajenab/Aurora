import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react";
import { productService } from "@/services/products.service";
import { PRODUCTS_PER_PAGE, SORT_OPTIONS, SITE } from "@/lib/constants";
import { titleCaseSlug } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  SectionHeading,
  Eyebrow,
} from "@/shared/components/section-heading";
import { EmptyState } from "@/shared/components/empty-state";
import { Reveal } from "@/shared/components/reveal";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/features/products/components/product-card";
import { ProductFilters } from "@/features/products/components/product-filters";
import type { SortOption } from "@/types";

/**
 * /products — the full catalog.
 *
 * Server Component. Reads searchParams, fetches via productService, renders
 * a sidebar + grid + pagination. The sidebar is a Client island
 * (ProductFilters) that mutates URL search params — the page re-renders
 * server-side on navigation.
 */
export const metadata: Metadata = {
  title: "Shop",
  description: `Browse the full ${SITE.name} catalog — considered objects across every category.`,
  alternates: { canonical: "/products" },
};

interface SearchParams {
  category?: string;
  sortBy?: string;
  page?: string;
  q?: string;
  minPrice?: string;
  maxPrice?: string;
}

function parseSort(value?: string): SortOption {
  const valid: SortOption[] = [
    "featured",
    "newest",
    "price-asc",
    "price-desc",
    "rating-desc",
    "title-asc",
  ];
  return (valid as string[]).includes(value ?? "")
    ? (value as SortOption)
    : "featured";
}

function parsePage(value?: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parsePrice(value?: string): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

/** Build a pagination href that preserves all current params. */
function pageHref(
  base: Record<string, string | undefined>,
  page: number,
): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v !== undefined && v !== "" && v !== "all" && k !== "page") {
      sp.set(k, v);
    }
  }
  if (page > 1) sp.set("page", String(page));
  const str = sp.toString();
  return `/products${str ? `?${str}` : ""}`;
}

/** Compute a compact page list with ellipses, e.g. 1 … 4 5 6 … 12. */
function pageList(current: number, totalPages: number): (number | "ellipsis")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | "ellipsis")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const category = params.category;
  const sortBy = parseSort(params.sortBy);
  const page = parsePage(params.page);
  const minPrice = parsePrice(params.minPrice);
  const maxPrice = parsePrice(params.maxPrice);

  // Fetch products + categories in parallel. Categories are non-critical.
  const [productsResult, categoriesResult] = await Promise.allSettled([
    productService.getProducts({
      category,
      sortBy,
      page,
      limit: PRODUCTS_PER_PAGE,
      minPrice,
      maxPrice,
      ...(params.q ? { search: params.q } : {}),
    }),
    productService.getCategories(),
  ]);

  const categories =
    categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

  // If products failed, render an error empty state.
  const failed = productsResult.status === "rejected";
  const data =
    productsResult.status === "fulfilled"
      ? productsResult.value
      : null;

  // Active filter summary for the page heading.
  const activeCategoryName = category
    ? titleCaseSlug(
        categories.find((c) => c.slug === category)?.name ?? category,
      )
    : null;
  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Featured";

  // Base params for pagination links.
  const linkBase: Record<string, string | undefined> = {
    category,
    sortBy: params.sortBy,
    q: params.q,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Eyebrow>Catalog</Eyebrow>
        <SectionHeading
          title={
            activeCategoryName
              ? activeCategoryName
              : params.q
                ? `Search: "${params.q}"`
                : "All products"
          }
          description={
            failed
              ? "We couldn't load products right now. Please try again."
              : "Refine by category or price to find the right object."
          }
        />
      </div>

      {/* Layout: sidebar + grid */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar (desktop) + mobile trigger inside */}
        <aside aria-label="Filters">
          <ProductFilters
            categories={categories}
            activeCategory={category ?? ""}
            activeSort={sortBy}
            minPrice={minPrice}
            maxPrice={maxPrice}
            total={data?.total}
          />
        </aside>

        {/* Main grid */}
        <section aria-label="Products">
          {/* Sort label summary — desktop */}
          <div className="mb-6 hidden items-center justify-between border-b border-border/60 pb-4 lg:flex">
            <p className="text-sm text-muted-foreground">
              {data
                ? `Showing ${data.items.length} of ${data.total}`
                : "No products to show"}
              {" · "}
              <span className="text-foreground">Sorted by {sortLabel}</span>
            </p>
          </div>

          {failed ? (
            <EmptyState
              icon={PackageSearch}
              title="We couldn't load products"
              description="A network or service error occurred. Please refresh the page."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/products">Retry</Link>
                </Button>
              }
            />
          ) : data && data.items.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
                {data.items.map((product, i) => (
                  <Reveal
                    key={product.id}
                    delay={Math.min(i * 0.04, 0.3)}
                    className="h-full"
                  >
                    <ProductCard
                      product={product}
                      priority={i < 4}
                      className="h-full"
                    />
                  </Reveal>
                ))}
              </div>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <nav
                  aria-label="Pagination"
                  className="mt-12 flex items-center justify-center gap-1.5"
                >
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full"
                    aria-disabled={!data.hasPrev}
                    aria-label="Previous page"
                  >
                    <Link
                      href={pageHref(linkBase, Math.max(1, page - 1))}
                      prefetch
                      aria-disabled={!data.hasPrev}
                      className={
                        !data.hasPrev
                          ? "pointer-events-none opacity-40"
                          : ""
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Link>
                  </Button>

                  <ul className="flex items-center gap-1">
                    {pageList(page, data.totalPages).map((p, i) =>
                      p === "ellipsis" ? (
                        <li
                          key={`e-${i}`}
                          className="flex h-9 w-9 items-center justify-center text-muted-foreground"
                          aria-hidden
                        >
                          …
                        </li>
                      ) : (
                        <li key={p}>
                          <Link
                            href={pageHref(linkBase, p)}
                            prefetch
                            aria-label={`Page ${p}`}
                            aria-current={p === page ? "page" : undefined}
                            className={`flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-sm tabular-nums transition-colors ${
                              p === page
                                ? "bg-foreground text-background"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            {p}
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 rounded-full"
                    aria-disabled={!data.hasNext}
                    aria-label="Next page"
                  >
                    <Link
                      href={pageHref(linkBase, Math.min(data.totalPages, page + 1))}
                      prefetch
                      aria-disabled={!data.hasNext}
                      className={
                        !data.hasNext
                          ? "pointer-events-none opacity-40"
                          : ""
                      }
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </nav>
              )}
            </>
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="No products match your filters"
              description="Try widening your price range or clearing the active category."
              action={
                <Button asChild variant="outline" className="rounded-full">
                  <Link href="/products">Clear all filters</Link>
                </Button>
              }
            />
          )}
        </section>
      </div>
    </div>
  );
}
