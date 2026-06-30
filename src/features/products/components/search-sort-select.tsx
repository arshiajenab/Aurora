"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SORT_OPTIONS } from "@/lib/constants";
import type { SortOption } from "@/types";

/**
 * SearchSortSelect — a tiny client island that mutates the URL when the user
 * changes the sort option on the search results page. Preserves the `q`
 * param (and resets the page).
 */
export function SearchSortSelect({
  activeSort,
  query,
}: {
  activeSort: SortOption;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = React.useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("q", query);
      next.set("sortBy", value);
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, query],
  );

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="search-sort"
        className="text-xs uppercase tracking-luxe text-muted-foreground"
      >
        Sort
      </label>
      <Select value={activeSort} onValueChange={handleChange}>
        <SelectTrigger
          id="search-sort"
          className="h-9 w-[180px]"
          aria-label="Sort results"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
