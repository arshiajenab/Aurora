import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * StockIndicator — a small dot + count for product tables.
 *
 * Monochrome encoding (no green/amber):
 *  - out of stock (0)   → destructive dot (the only non-neutral, reserved
 *                          for the failure state)
 *  - low stock (<20)    → muted-foreground dot
 *  - in stock (>=20)    → foreground dot
 */
export function StockIndicator({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) {
  const out = stock === 0;
  const low = stock > 0 && stock < 20;
  const dotClass = out
    ? "bg-destructive"
    : low
      ? "bg-muted-foreground"
      : "bg-foreground";

  const label = out ? "Out of stock" : low ? "Low stock" : "In stock";

  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm", className)}
      title={label}
    >
      <span className={cn("h-2 w-2 rounded-full", dotClass)} aria-hidden />
      <span className="tabular-nums">{stock}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Compact badge variant for the table's Status column. */
export function StockBadge({ stock }: { stock: number }) {
  const out = stock === 0;
  const low = stock > 0 && stock < 20;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight",
        out
          ? "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20"
          : low
            ? "border-transparent bg-muted text-muted-foreground"
            : "border-transparent bg-secondary text-secondary-foreground",
      )}
    >
      {out ? "Out of stock" : low ? "Low" : "In stock"}
    </span>
  );
}
