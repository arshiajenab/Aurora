"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * CustomersToolbar — debounced search input that writes `?q=` to the URL.
 * The customers page is a server component reading searchParams, so a URL
 * change re-runs the server fetch.
 */
const DEBOUNCE_MS = 240;

export function CustomersToolbar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [search, setSearch] = React.useState(initialQuery);

  React.useEffect(() => {
    setSearch(initialQuery);
  }, [initialQuery]);

  React.useEffect(() => {
    const handle = setTimeout(() => {
      const next = new URLSearchParams(params?.toString() ?? "");
      if (search.trim()) {
        next.set("q", search.trim());
      } else {
        next.delete("q");
      }
      next.delete("page");
      const qs = next.toString();
      router.replace(qs ? `/admin/customers?${qs}` : "/admin/customers");
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [search, router, params]);

  return (
    <div className="relative max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name or email…"
        className="h-10 rounded-full pl-9 pr-9"
        aria-label="Search customers"
      />
      {search && (
        <button
          type="button"
          onClick={() => setSearch("")}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
