"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";
import type { SortOption } from "@/types";
import { toast } from "sonner";

/**
 * ProductsToolbar — the client toolbar above the products table.
 *
 * Wires `?q=` (search) and `?sortBy=` (sort) into the URL via
 * `router.replace`. The products page is a server component that reads
 * `searchParams`, so updating the URL re-runs the data fetch on the
 * server. We debounce the search input (240ms) to avoid thrashing.
 *
 * "Export" is a mock — it shows a toast to confirm intent without doing
 * real work (the catalog isn't ours to export).
 */

const DEBOUNCE_MS = 240;

export function ProductsToolbar({
  total,
  page,
  sortBy,
  q,
}: {
  total: number;
  page: number;
  sortBy: SortOption;
  q: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  // Local state seeded from the URL so the input feels instant.
  const [search, setSearch] = React.useState(q);
  React.useEffect(() => {
    setSearch(q);
  }, [q]);

  // Build the next URL, preserving the other params we care about.
  const buildHref = React.useCallback(
    (next: { q?: string; sortBy?: SortOption; page?: number }) => {
      const sp = new URLSearchParams(params?.toString() ?? "");
      if (next.q !== undefined) {
        if (next.q) sp.set("q", next.q);
        else sp.delete("q");
      }
      if (next.sortBy !== undefined) {
        sp.set("sortBy", next.sortBy);
      }
      if (next.page !== undefined) {
        if (next.page > 1) sp.set("page", String(next.page));
        else sp.delete("page");
      } else if (next.q !== undefined || next.sortBy !== undefined) {
        // Reset to page 1 whenever the query changes.
        sp.delete("page");
      }
      const qs = sp.toString();
      return qs ? `/admin/products?${qs}` : "/admin/products";
    },
    [params],
  );

  // Debounced search → URL.
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if (search === q) return;
      router.replace(buildHref({ q: search }));
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [search, q, router, buildHref]);

  const onSortChange = (value: string) => {
    router.replace(buildHref({ sortBy: value as SortOption }));
  };

  const onClearSearch = () => {
    setSearch("");
    router.replace(buildHref({ q: "" }));
  };

  const onExport = () => {
    toast.success("Export queued", {
      description: "A CSV of the catalog will be ready in a moment.",
    });
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-baseline gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">
            {total.toLocaleString()}
          </span>{" "}
          products
          {page > 1 && (
            <span className="text-muted-foreground/70"> · page {page}</span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, brand, SKU…"
            className="h-9 w-full pl-8 pr-8 text-sm sm:w-64"
            aria-label="Search products"
          />
          {search && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger size="sm" className="w-full sm:w-48" aria-label="Sort products">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={onExport}
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </div>
  );
}
