import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { productService } from "@/services/products.service";
import { titleCaseSlug } from "@/lib/format";
import { SITE } from "@/lib/constants";
import { Reveal } from "@/shared/components/reveal";
import {
  SectionHeading,
  Eyebrow,
} from "@/shared/components/section-heading";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Categories",
  description: `Browse ${SITE.name} by category — distinct collections, each considered on its own terms.`,
  alternates: { canonical: "/categories" },
};

/**
 * /categories — premium grid of category tiles.
 *
 * Server Component. Each tile links to /products?category={slug}.
 * Failures degrade to an EmptyState.
 */
export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof productService.getCategories>> = [];
  try {
    categories = await productService.getCategories();
  } catch {
    categories = [];
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="flex flex-col gap-3">
        <Eyebrow>Catalog</Eyebrow>
        <SectionHeading
          title="All categories"
          description="Distinct collections, each considered on its own terms. Tap any to browse the full selection."
        />
      </div>

      {categories.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="We couldn't load categories"
            description="Please try again in a moment while we refresh the catalog."
            action={
              <Button asChild className="rounded-full">
                <Link href="/products">Browse all products</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat, i) => (
            <Reveal
              key={cat.slug}
              delay={Math.min(i * 0.05, 0.3)}
              className="h-full"
            >
              <Link
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                className="group relative flex aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors hover:border-border"
              >
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-6">
                  <div className="flex flex-col gap-1 text-white">
                    <span className="text-[10px] uppercase tracking-luxe opacity-80">
                      Collection
                    </span>
                    <span className="text-xl font-semibold tracking-tight">
                      {titleCaseSlug(cat.name)}
                    </span>
                    <span className="text-xs opacity-70">
                      Browse the selection
                    </span>
                  </div>
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-black transition-transform duration-300 group-hover:scale-110">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
