"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SORT_OPTIONS } from "@/lib/constants";
import { titleCaseSlug } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ProductCategory, SortOption } from "@/types";

/**
 * ProductFilters — the catalog sidebar.
 *
 * Design decisions:
 *  - The URL is the SINGLE source of truth. No client state — every change
 *    updates `router.push` with new search params. This means filters are
 *    shareable, back-button friendly, and never drift from server data.
 *  - On desktop, it renders inline in a sticky sidebar.
 *  - On mobile, it renders inside a Sheet triggered by a button — same UI.
 *  - `onChangeCommitted` is called whenever the Sheet closes (mobile only),
 *    so we don't push on every keystroke.
 */
export interface ProductFiltersProps {
  categories: ProductCategory[];
  /** Currently active category slug ("" means all). */
  activeCategory: string;
  activeSort: SortOption;
  minPrice?: number;
  maxPrice?: number;
  /** Optional total product count for the current filter set. */
  total?: number;
  className?: string;
}

/** Build a new search-params string from the current params + overrides. */
function buildHref(
  searchParams: URLSearchParams,
  overrides: Record<string, string | number | undefined>,
): string {
  const next = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "" || value === "all") {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  // Reset to page 1 whenever filters change.
  if (
    "category" in overrides ||
    "minPrice" in overrides ||
    "maxPrice" in overrides ||
    "sortBy" in overrides
  ) {
    next.delete("page");
  }
  const str = next.toString();
  return str ? `?${str}` : "?";
}

const CATEGORY_ALL = "all";

export function ProductFilters({
  categories,
  activeCategory,
  activeSort,
  minPrice,
  maxPrice,
  total,
  className,
}: ProductFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local input state for the price fields so the user can type freely.
  const [minInput, setMinInput] = React.useState(
    minPrice !== undefined ? String(minPrice) : "",
  );
  const [maxInput, setMaxInput] = React.useState(
    maxPrice !== undefined ? String(maxPrice) : "",
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);

  // Sync local state when the URL changes (e.g. back/forward).
  React.useEffect(() => {
    setMinInput(minPrice !== undefined ? String(minPrice) : "");
    setMaxInput(maxPrice !== undefined ? String(maxPrice) : "");
  }, [minPrice, maxPrice]);

  const navigate = React.useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const href = buildHref(searchParams, overrides);
      router.push(`${pathname}${href}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleCategory = (value: string) => {
    navigate({ category: value === CATEGORY_ALL ? undefined : value });
  };

  const handleSort = (value: string) => {
    navigate({ sortBy: value as SortOption });
  };

  // Debounce price inputs so we don't spam the router on every keystroke.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      const min = minInput === "" ? undefined : Number(minInput);
      const max = maxInput === "" ? undefined : Number(maxInput);
      const nextMin = !Number.isFinite(min) || (min !== undefined && min < 0) ? undefined : min;
      const nextMax = !Number.isFinite(max) || (max !== undefined && max < 0) ? undefined : max;
      // Only push if the value actually changed from the URL.
      const urlMin = minPrice;
      const urlMax = maxPrice;
      if (nextMin !== urlMin || nextMax !== urlMax) {
        navigate({ minPrice: nextMin, maxPrice: nextMax });
      }
    }, 500);
    return () => clearTimeout(handle);
  }, [minInput, maxInput, minPrice, maxPrice, navigate]);

  const hasActiveFilters =
    activeCategory !== "" ||
    minPrice !== undefined ||
    maxPrice !== undefined;

  const clearAll = () => {
    setMinInput("");
    setMaxInput("");
    navigate({ category: undefined, minPrice: undefined, maxPrice: undefined });
  };

  // The shared filter panel — used both inline and in the mobile Sheet.
  const panel = (
    <div className="flex flex-col gap-8">
      {/* Sort */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-medium uppercase tracking-luxe text-muted-foreground">
          Sort by
        </Label>
        <Select value={activeSort} onValueChange={handleSort}>
          <SelectTrigger className="w-full" aria-label="Sort products">
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

      <Separator />

      {/* Categories */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-medium uppercase tracking-luxe text-muted-foreground">
          Category
        </Label>
        <RadioGroup
          value={activeCategory || CATEGORY_ALL}
          onValueChange={handleCategory}
          className="gap-2.5"
        >
          <label
            htmlFor="cat-all"
            className={cn(
              "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
              !activeCategory && "bg-accent font-medium",
            )}
          >
            <RadioGroupItem id="cat-all" value={CATEGORY_ALL} />
            All products
          </label>
          {categories.map((cat) => {
            const checked = activeCategory === cat.slug;
            return (
              <label
                key={cat.slug}
                htmlFor={`cat-${cat.slug}`}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                  checked && "bg-accent font-medium",
                )}
              >
                <RadioGroupItem id={`cat-${cat.slug}`} value={cat.slug} />
                {titleCaseSlug(cat.name)}
              </label>
            );
          })}
        </RadioGroup>
      </div>

      <Separator />

      {/* Price range */}
      <div className="flex flex-col gap-3">
        <Label className="text-xs font-medium uppercase tracking-luxe text-muted-foreground">
          Price range
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground">Min</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={minInput}
                onChange={(e) => setMinInput(e.target.value)}
                placeholder="0"
                aria-label="Minimum price"
                className="pl-7"
              />
            </div>
          </div>
          <span className="mt-5 text-muted-foreground">–</span>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-muted-foreground">Max</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                $
              </span>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={maxInput}
                onChange={(e) => setMaxInput(e.target.value)}
                placeholder="∞"
                aria-label="Maximum price"
                className="pl-7"
              />
            </div>
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="gap-1.5 self-start text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Header row with count + mobile trigger */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-luxe text-muted-foreground">
            {typeof total === "number"
              ? `${total} ${total === 1 ? "object" : "objects"}`
              : "Filter"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-full lg:hidden"
          onClick={() => setMobileOpen(true)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </Button>
      </div>

      {/* Desktop sticky sidebar */}
      <div className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pb-8 scrollbar-thin">
          {panel}
        </div>
      </div>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="flex w-full flex-col p-0 sm:max-w-sm">
          <SheetHeader className="flex flex-row items-center justify-between border-b px-6 py-5">
            <SheetTitle className="text-base font-semibold tracking-tight">
              Filters
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin">
            {panel}
          </div>
          <div className="border-t px-6 py-4">
            <Button
              className="w-full rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              Show results
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
