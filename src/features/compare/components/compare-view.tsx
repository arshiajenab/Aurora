"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Scale,
  X,
  ShoppingBag,
  Star,
  Tags,
  Package,
  Ruler,
  Weight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Boxes,
  Hash,
  Building2,
  Layers,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/shared/components/empty-state";
import {
  useCompareStore,
  MAX_COMPARE,
} from "@/features/compare/store/compare-store";
import { useCartStore } from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import {
  formatCurrency,
  formatPercent,
  titleCaseSlug,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types";

/**
 * CompareView — the heart of the compare page.
 *
 * Reads compare ids from the persisted client store, fetches full product
 * data in parallel, and renders an Apple-spec-sheet-style comparison table
 * with a sticky first column (attribute labels) and horizontally scrolling
 * product columns.
 *
 * Hydration-safe: returns a skeleton until `mounted` is true so the SSR
 * markup never mismatches persisted state.
 */
export function CompareView() {
  const mounted = useMounted();
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const addItem = useCartStore((s) => s.addItem);

  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [busyId, setBusyId] = React.useState<number | null>(null);

  // Fetch all selected products whenever ids change.
  React.useEffect(() => {
    if (!mounted || ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all(
      ids.map(async (id): Promise<Product | null> => {
        try {
          const res = await fetch(`/api/products/${id}`);
          if (!res.ok) return null;
          return (await res.json()) as Product;
        } catch {
          return null;
        }
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const ok = results.filter((p): p is Product => p !== null);
        // Preserve the user's compare order (matches the store order).
        const ordered = ids
          .map((id) => ok.find((p) => p.id === id))
          .filter((p): p is Product => p !== null);
        setProducts(ordered);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ids, mounted]);

  const handleRemove = (product: Product) => {
    remove(product.id);
    toast.success("Removed from compare", {
      description: product.title,
    });
  };

  const handleAddToBag = async (product: Product) => {
    if (product.stock <= 0) {
      toast.error("Out of stock", { description: product.title });
      return;
    }
    setBusyId(product.id);
    try {
      addItem(product, 1);
      toast.success("Added to bag", { description: product.title });
    } finally {
      setBusyId(null);
    }
  };

  const handleClear = () => {
    clear();
    toast.success("Compare list cleared");
  };

  // Pre-mount: render skeleton to avoid hydration mismatch with persisted store.
  if (!mounted) {
    return <CompareViewSkeleton />;
  }

  // Empty state.
  if (ids.length === 0) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={Scale}
          title="No products to compare"
          description="Add up to 4 products to compare their specifications side by side."
          action={
            <Button asChild className="rounded-full">
              <Link href="/products">Browse products</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <span className="inline-block text-xs font-medium uppercase tracking-luxe text-muted-foreground">
          Side by side
        </span>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="flex items-baseline gap-3 text-3xl font-semibold tracking-tight">
            Compare
            <span className="text-base font-normal text-muted-foreground tabular-nums">
              {ids.length} of {MAX_COMPARE}
            </span>
          </h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="gap-1.5 rounded-full text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </Button>
        </div>
      </div>

      <Separator className="mt-6" />

      {/* Table */}
      <div className="mt-6">
        {loading && products.length === 0 ? (
          <CompareTableSkeleton columns={ids.length} />
        ) : (
          <CompareTable
            products={products}
            onRemove={handleRemove}
            onAddToBag={handleAddToBag}
            busyId={busyId}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Comparison table                                                    */
/* ------------------------------------------------------------------ */

interface AttributeRow {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  render: (p: Product) => React.ReactNode;
}

const ATTRIBUTE_ROWS: AttributeRow[] = [
  {
    key: "price",
    label: "Price",
    icon: Hash,
    render: (p) => (
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tabular-nums">
          {formatCurrency(p.price)}
        </span>
        {p.discountPercentage > 0 && (
          <span className="text-xs text-muted-foreground line-through tabular-nums">
            {formatCurrency(p.priceBeforeDiscount)}
          </span>
        )}
      </div>
    ),
  },
  {
    key: "discount",
    label: "Discount",
    icon: Percent,
    render: (p) =>
      p.discountPercentage > 0 ? (
        <span className="inline-flex items-center rounded-full bg-foreground px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-background">
          -{formatPercent(p.discountPercentage, 0)}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "rating",
    label: "Rating",
    icon: Star,
    render: (p) => (
      <span className="inline-flex items-center gap-1.5 text-sm tabular-nums">
        <Star className="h-3.5 w-3.5 fill-current" />
        {p.rating.toFixed(1)}
        <span className="text-xs text-muted-foreground">
          ({p.reviews.length})
        </span>
      </span>
    ),
  },
  {
    key: "stock",
    label: "Stock",
    icon: Boxes,
    render: (p) =>
      p.stock <= 0 ? (
        <span className="text-sm text-muted-foreground">Sold out</span>
      ) : (
        <span className="text-sm tabular-nums">
          {p.stock}
          <span className="ml-1 text-xs text-muted-foreground">units</span>
        </span>
      ),
  },
  {
    key: "brand",
    label: "Brand",
    icon: Building2,
    render: (p) =>
      p.brand ? (
        <span className="text-sm">{p.brand}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "category",
    label: "Category",
    icon: Layers,
    render: (p) => (
      <Link
        href={`/products?category=${encodeURIComponent(p.category)}`}
        className="text-sm capitalize transition-colors hover:text-foreground hover:underline"
      >
        {titleCaseSlug(p.category)}
      </Link>
    ),
  },
  {
    key: "sku",
    label: "SKU",
    icon: Hash,
    render: (p) => (
      <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
    ),
  },
  {
    key: "weight",
    label: "Weight",
    icon: Weight,
    render: (p) => (
      <span className="text-sm tabular-nums">{p.weight} kg</span>
    ),
  },
  {
    key: "dimensions",
    label: "Dimensions",
    icon: Ruler,
    render: (p) => (
      <span className="text-xs tabular-nums">
        {p.dimensions.width} × {p.dimensions.height} × {p.dimensions.depth} cm
      </span>
    ),
  },
  {
    key: "warranty",
    label: "Warranty",
    icon: ShieldCheck,
    render: (p) => (
      <span className="text-xs leading-relaxed text-muted-foreground">
        {p.warrantyInformation}
      </span>
    ),
  },
  {
    key: "shipping",
    label: "Shipping",
    icon: Truck,
    render: (p) => (
      <span className="text-xs leading-relaxed text-muted-foreground">
        {p.shippingInformation}
      </span>
    ),
  },
  {
    key: "availability",
    label: "Availability",
    icon: Package,
    render: (p) => (
      <span className="text-xs text-muted-foreground">
        {p.availabilityStatus}
      </span>
    ),
  },
  {
    key: "return",
    label: "Return policy",
    icon: RotateCcw,
    render: (p) => (
      <span className="text-xs leading-relaxed text-muted-foreground">
        {p.returnPolicy}
      </span>
    ),
  },
  {
    key: "minOrder",
    label: "Min. order qty",
    icon: Package,
    render: (p) => (
      <span className="text-sm tabular-nums">
        {p.minimumOrderQuantity}{" "}
        <span className="text-xs text-muted-foreground">units</span>
      </span>
    ),
  },
  {
    key: "tags",
    label: "Tags",
    icon: Tags,
    render: (p) =>
      p.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {p.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "description",
    label: "Description",
    icon: Hash,
    render: (p) => (
      <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4">
        {p.description}
      </p>
    ),
  },
];

function CompareTable({
  products,
  onRemove,
  onAddToBag,
  busyId,
}: {
  products: Product[];
  onRemove: (p: Product) => void;
  onAddToBag: (p: Product) => void;
  busyId: number | null;
}) {
  return (
    <div className="overflow-x-auto scrollbar-thin pb-2">
      <table className="w-full min-w-[760px] border-separate border-spacing-0">
        {/* Header row: product images + remove + title */}
        <thead>
          <tr>
            <th className="sticky left-0 z-20 w-44 bg-background align-bottom text-left">
              <div className="flex h-full flex-col justify-end gap-1 py-4 pr-4">
                <span className="text-[10px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Attributes
                </span>
                <span className="text-sm font-semibold tracking-tight">
                  Specification
                </span>
              </div>
            </th>
            <AnimatePresence initial={false}>
              {products.map((p, i) => (
                <th
                  key={p.id}
                  className="w-[240px] min-w-[240px] align-top"
                >
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                      delay: Math.min(i * 0.04, 0.2),
                    }}
                    className="flex flex-col gap-3 px-3 pb-3"
                  >
                    <div className="relative">
                      <Link
                        href={`/products/${p.id}`}
                        className="group relative block aspect-square overflow-hidden rounded-2xl border border-border/60 bg-muted"
                      >
                        <Image
                          src={p.thumbnail}
                          alt={p.title}
                          fill
                          sizes="240px"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </Link>
                      <button
                        type="button"
                        onClick={() => onRemove(p)}
                        aria-label={`Remove ${p.title} from compare`}
                        className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur-md transition-all hover:bg-background hover:shadow-sm"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link
                      href={`/products/${p.id}`}
                      className="line-clamp-2 text-sm font-medium tracking-tight transition-colors hover:underline"
                    >
                      {p.title}
                    </Link>
                  </motion.div>
                </th>
              ))}
            </AnimatePresence>
          </tr>
        </thead>

        {/* Attribute rows */}
        <tbody>
          {ATTRIBUTE_ROWS.map((row, ri) => {
            const zebra = ri % 2 === 1;
            return (
              <tr key={row.key}>
                <th
                  className={cn(
                    "sticky left-0 z-10 align-middle text-left",
                    zebra ? "bg-muted/40" : "bg-background",
                  )}
                >
                  <div className="flex items-center gap-2 py-3 pr-4">
                    <row.icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {row.label}
                    </span>
                  </div>
                </th>
                {products.map((p) => (
                  <td
                    key={p.id}
                    className={cn(
                      "align-top",
                      zebra ? "bg-muted/40" : "bg-transparent",
                    )}
                  >
                    <div className="px-3 py-3 text-foreground">
                      {row.render(p)}
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}

          {/* Footer row: add to bag */}
          <tr>
            <th className="sticky left-0 z-10 bg-background align-middle">
              <div className="py-4 pr-4">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Action
                </span>
              </div>
            </th>
            {products.map((p) => {
              const outOfStock = p.stock <= 0;
              const busy = busyId === p.id;
              return (
                <td key={p.id} className="align-top">
                  <div className="px-3 py-4">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAddToBag(p)}
                      disabled={outOfStock || busy}
                      className="w-full gap-1.5 rounded-full"
                    >
                      {busy ? (
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                      ) : (
                        <ShoppingBag className="h-3.5 w-3.5" />
                      )}
                      {outOfStock ? "Sold out" : "Add to bag"}
                    </Button>
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

function CompareViewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-3">
        <div className="h-3 w-20 skeleton-shimmer rounded" />
        <div className="h-9 w-40 skeleton-shimmer rounded" />
      </div>
      <div className="mt-6 h-px w-full bg-border/60" />
      <div className="mt-6 flex gap-4 overflow-hidden">
        <div className="h-72 w-44 shrink-0 skeleton-shimmer rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-72 w-[240px] shrink-0 skeleton-shimmer rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}

function CompareTableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="overflow-x-auto scrollbar-thin pb-2">
      <div className="flex min-w-[760px] gap-4">
        <div className="w-44 shrink-0 space-y-3">
          <div className="h-12 skeleton-shimmer rounded-xl" />
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 skeleton-shimmer rounded" />
          ))}
        </div>
        {Array.from({ length: Math.max(columns, 2) }).map((_, i) => (
          <div key={i} className="w-[240px] shrink-0 space-y-3">
            <div className="aspect-square skeleton-shimmer rounded-2xl" />
            <div className="h-4 w-3/4 skeleton-shimmer rounded" />
            {Array.from({ length: 12 }).map((_, j) => (
              <div key={j} className="h-6 skeleton-shimmer rounded" />
            ))}
            <div className="h-8 skeleton-shimmer rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
