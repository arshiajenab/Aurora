import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/shared/components/section-heading";

/**
 * Product detail loading state — a stable skeleton that mirrors the layout.
 */
export default function ProductDetailLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-3 w-12 skeleton-shimmer rounded" />
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery skeleton */}
        <div className="flex flex-col-reverse gap-4 sm:flex-row">
          <div className="flex gap-3 sm:flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-16 w-16 skeleton-shimmer rounded-lg sm:h-20 sm:w-20"
              />
            ))}
          </div>
          <div className="aspect-square w-full skeleton-shimmer rounded-2xl" />
        </div>

        {/* Info skeleton */}
        <div className="flex flex-col gap-6">
          <div className="h-3 w-24 skeleton-shimmer rounded" />
          <div className="h-9 w-3/4 skeleton-shimmer rounded" />
          <div className="h-4 w-40 skeleton-shimmer rounded" />
          <div className="h-10 w-32 skeleton-shimmer rounded" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-3 w-full skeleton-shimmer rounded"
              />
            ))}
          </div>
          <div className="h-12 w-full skeleton-shimmer rounded-full" />
          <div className="h-12 w-48 skeleton-shimmer rounded-full" />
        </div>
      </div>

      <div className="mt-20">
        <SectionHeading title="Related objects" />
        <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square skeleton-shimmer rounded-2xl"
            />
          ))}
        </div>
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">Back to catalog</Link>
        </Button>
      </div>
    </div>
  );
}
