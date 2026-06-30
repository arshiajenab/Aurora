import {
  SectionHeading,
} from "@/shared/components/section-heading";
import { ProductCardSkeleton } from "@/features/products/components/product-card";

/**
 * Catalog loading state — a stable skeleton that matches the page layout.
 * Shown automatically by Next.js when the route segment is streaming.
 */
export default function ProductsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-24 skeleton-shimmer rounded" />
        <SectionHeading title="All products" />
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="h-3 w-20 skeleton-shimmer rounded" />
                <div className="h-9 w-full skeleton-shimmer rounded-md" />
              </div>
            ))}
          </div>
        </aside>

        {/* Grid skeleton */}
        <section>
          <div className="mb-6 hidden items-center justify-between border-b border-border/60 pb-4 lg:flex">
            <div className="h-4 w-48 skeleton-shimmer rounded" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
