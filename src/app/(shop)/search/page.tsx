import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import { productService } from "@/services/products.service";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/shared/components/empty-state";
import { Reveal } from "@/shared/components/reveal";
import { Eyebrow } from "@/shared/components/section-heading";
import {
  ProductCard,
} from "@/features/products/components/product-card";
import { SearchSortSelect } from "@/features/products/components/search-sort-select";
import type { SortOption } from "@/types";

/**
 * /search — search results page.
 *
 * Server Component. Reads `q` and `page` from searchParams, calls
 * productService.getProducts({search}), renders a simple grid + pagination.
 * Sort select is a small inline client island.
 */

interface SearchParams {
  q?: string;
  page?: string;
  sortBy?: string;
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

function pageHref(
  base: { q?: string; sortBy?: string },
  page: number,
): string {
  const sp = new URLSearchParams();
  if (base.q) sp.set("q", base.q);
  if (base.sortBy) sp.set("sortBy", base.sortBy);
  if (page > 1) sp.set("page", String(page));
  const str = sp.toString();
  return `/search${str ? `?${str}` : ""}`;
}

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

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const title = q ? `Search: "${q}"` : "Search";
  return {
    title,
    description: q
      ? `Search results for "${q}" in the Aurora catalog.`
      : "Search the Aurora catalog.",
    alternates: { canonical: "/search" },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const sortBy = parseSort(params.sortBy);
  const page = parsePage(params.page);

  // Render empty state when no query.
  if (!q) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          <Eyebrow>Search</Eyebrow>
          <h1 className="text-3xl font-semibold tracking-tight">
            Search the catalog
          </h1>
        </div>
        <div className="mt-10">
          <EmptyState
            icon={SearchX}
            title="Start typing to search"
            description="Use the search bar in the header to find products across the entire Aurora catalog."
            action={
              <Button asChild className="rounded-full">
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  // Fetch results.
  const [results] = await Promise.allSettled([
    productService.getProducts({
      search: q,
      page,
      limit: PRODUCTS_PER_PAGE,
      sortBy,
    }),
  ]);

  const failed = results.status === "rejected";
  const data = results.status === "fulfilled" ? results.value : null;

  const linkBase = { q, sortBy: params.sortBy };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Search</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-3xl font-semibold tracking-tight">
              Results for &ldquo;{q}&rdquo;
            </h1>
            {data && (
              <p className="text-sm text-muted-foreground">
                {data.total} {data.total === 1 ? "object" : "objects"} found
              </p>
            )}
          </div>
          {/* Sort inline */}
          <SearchSortSelect activeSort={sortBy} query={q} />
        </div>
      </div>

      {/* Results */}
      <div className="mt-10">
        {failed ? (
          <EmptyState
            icon={SearchX}
            title="We couldn't complete your search"
            description="A network or service error occurred. Please try again."
            action={
              <Button asChild className="rounded-full">
                <Link href={`/search?q=${encodeURIComponent(q)}`}>Retry</Link>
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
                >
                  <Link
                    href={pageHref(linkBase, Math.max(1, page - 1))}
                    aria-disabled={!data.hasPrev}
                    className={
                      !data.hasPrev ? "pointer-events-none opacity-40" : ""
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
                >
                  <Link
                    href={pageHref(linkBase, Math.min(data.totalPages, page + 1))}
                    aria-disabled={!data.hasNext}
                    className={
                      !data.hasNext ? "pointer-events-none opacity-40" : ""
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
            icon={SearchX}
            title={`No results for "${q}"`}
            description="Try a different search term, or browse the full catalog."
            action={
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        )}
      </div>
    </div>
  );
}
