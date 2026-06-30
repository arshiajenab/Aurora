import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import { productService } from "@/services/products.service";
import { SITE } from "@/lib/constants";
import { titleCaseSlug } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  SectionHeading,
  Eyebrow,
} from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { EmptyState } from "@/shared/components/empty-state";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/features/products/components/product-card";
import type { Product, ProductCategory } from "@/types";

export const metadata: Metadata = {
  title: "Home",
  alternates: { canonical: "/" },
};

/**
 * Landing page — editorial, monochrome, premium.
 *
 * Server Component: data is fetched directly via the productService.
 * Failures degrade gracefully (EmptyState) — the page never crashes.
 */
export default async function HomePage() {
  // Fetch all the streams in parallel; each is independently fault-tolerant.
  const [featured, newArrivals, categories] = await Promise.allSettled([
    productService.getFeatured(8),
    productService.getNewArrivals(8),
    productService.getCategories(),
  ]);

  const featuredProducts =
    featured.status === "fulfilled" ? featured.value : [];
  const newArrivalProducts =
    newArrivals.status === "fulfilled" ? newArrivals.value : [];
  const categoryList =
    categories.status === "fulfilled" ? categories.value : [];

  // Hero image — use the top-rated featured product for a premium product shot.
  const heroProduct = featuredProducts[0];

  return (
    <div className="flex flex-col">
      {/* ----------------------------------------------------------------- */}
      {/* HERO                                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-border/60">
        {/* Subtle grid texture with radial mask */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-grid [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)]"
        />

        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-28">
          {/* Copy */}
          <div className="flex flex-col items-start gap-6">
            <Reveal>
              <Eyebrow>Aurora — Est. 2024</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                Objects of quiet intention.
              </h1>
            </Reveal>
            <Reveal delay={0.1}>
              <p className="max-w-xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
                {SITE.description}
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="gap-1.5 rounded-full px-6"
                >
                  <Link href="/products">
                    Shop the collection
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full px-6"
                >
                  <Link href="/categories">Explore categories</Link>
                </Button>
              </div>
            </Reveal>

            {/* Stat row */}
            <Reveal delay={0.2}>
              <dl className="mt-6 flex flex-wrap items-center gap-x-10 gap-y-4 border-t border-border/60 pt-6">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs uppercase tracking-luxe text-muted-foreground">
                    Curated
                  </dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                    200+
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs uppercase tracking-luxe text-muted-foreground">
                    Categories
                  </dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                    20+
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs uppercase tracking-luxe text-muted-foreground">
                    Rating
                  </dt>
                  <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                    4.8
                  </dd>
                </div>
              </dl>
            </Reveal>
          </div>

          {/* Visual */}
          <Reveal delay={0.15} className="relative">
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border border-border/60 bg-muted lg:max-w-none">
              {heroProduct ? (
                <Image
                  src={heroProduct.thumbnail}
                  alt={heroProduct.title}
                  fill
                  priority
                  sizes="(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 90vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/40" />
              )}
              {/* Soft glass overlay with the product name */}
              {heroProduct && (
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/55 via-black/15 to-transparent p-5">
                  <div className="flex flex-col gap-1 text-white">
                    <span className="text-[10px] uppercase tracking-luxe opacity-80">
                      Featured
                    </span>
                    <span className="text-sm font-medium tracking-tight">
                      {heroProduct.title}
                    </span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    className="gap-1.5 rounded-full bg-white px-4 text-black hover:bg-white/90"
                  >
                    <Link href={`/products/${heroProduct.id}`}>
                      View
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* VALUE PROPS BAND                                                  */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px overflow-hidden sm:grid-cols-3">
          {[
            {
              icon: Truck,
              title: "Free shipping",
              description: "On all orders over $250, delivered carbon-neutral.",
            },
            {
              icon: RotateCcw,
              title: "30-day returns",
              description: "Change your mind? Return it, on us, no questions.",
            },
            {
              icon: ShieldCheck,
              title: "2-year warranty",
              description: "Every object backed by our considered guarantee.",
            },
          ].map((prop) => (
            <div
              key={prop.title}
              className="flex flex-col items-center gap-2 px-6 py-8 text-center"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-card">
                <prop.icon className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-medium tracking-tight">
                {prop.title}
              </h3>
              <p className="max-w-xs text-xs text-muted-foreground">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FEATURED PRODUCTS                                                 */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <Reveal>
          <SectionHeading
            eyebrow="Curated"
            title="Featured this season"
            description="A small selection of objects we keep coming back to — chosen for craft, materials, and longevity."
            action={
              <Button
                asChild
                variant="ghost"
                className="gap-1.5 rounded-full"
              >
                <Link href="/products">
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            }
          />
        </Reveal>

        <div className="mt-10">
          {featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
              {featuredProducts.map((product: Product, i: number) => (
                <Reveal
                  key={product.id}
                  delay={Math.min(i * 0.05, 0.3)}
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
          ) : (
            <EmptyState
              title="We couldn't load featured products"
              description="Please check back shortly while we refresh the catalog."
              action={
                <Button asChild className="rounded-full">
                  <Link href="/products">Browse all products</Link>
                </Button>
              }
            />
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* CATEGORY SHOWCASE                                                 */}
      {/* ----------------------------------------------------------------- */}
      {categoryList.length > 0 && (
        <section className="border-y border-border/60 bg-muted/30">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <Reveal>
              <SectionHeading
                eyebrow="Browse"
                title="Shop by category"
                description="Distinct collections, each considered on its own terms."
                action={
                  <Button
                    asChild
                    variant="ghost"
                    className="gap-1.5 rounded-full"
                  >
                    <Link href="/categories">
                      All categories
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                }
              />
            </Reveal>

            <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
              {categoryList.slice(0, 8).map((category: ProductCategory, i) => (
                <Reveal
                  key={category.slug}
                  delay={Math.min(i * 0.05, 0.3)}
                  className="h-full"
                >
                  <Link
                    href={`/products?category=${encodeURIComponent(category.slug)}`}
                    className="group relative flex h-full aspect-[4/5] overflow-hidden rounded-2xl border border-border/60 bg-card"
                  >
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4">
                      <div className="flex flex-col gap-0.5 text-white">
                        <span className="text-[10px] uppercase tracking-luxe opacity-80">
                          Collection
                        </span>
                        <span className="text-sm font-medium tracking-tight">
                          {titleCaseSlug(category.name)}
                        </span>
                      </div>
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-black opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* EDITORIAL QUOTE BAND                                              */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
        <Reveal>
          <span className="text-xs uppercase tracking-luxe text-muted-foreground">
            A note from the editors
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <blockquote className="mt-6 text-balance text-2xl font-medium leading-tight tracking-tight sm:text-3xl lg:text-4xl lg:leading-[1.15]">
            &ldquo;We don&rsquo;t sell things. We curate objects worth keeping
            &mdash; quiet pieces that earn their place, day after day.&rdquo;
          </blockquote>
        </Reveal>
        <Reveal delay={0.1}>
          <footer className="mt-6 flex flex-col items-center gap-1">
            <span className="text-sm font-medium">The Aurora Editors</span>
            <span className="text-xs text-muted-foreground">
              Curatorial team, {new Date().getFullYear()}
            </span>
          </footer>
        </Reveal>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* NEW ARRIVALS RAIL                                                 */}
      {/* ----------------------------------------------------------------- */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <Reveal>
            <SectionHeading
              eyebrow="Just landed"
              title="New arrivals"
              description="The latest additions — fresh from the studio, in limited quantities."
              action={
                <Button
                  asChild
                  variant="ghost"
                  className="gap-1.5 rounded-full"
                >
                  <Link href="/products?sortBy=newest">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              }
            />
          </Reveal>

          <div className="mt-10">
            {newArrivalProducts.length > 0 ? (
              <div className="-mx-4 overflow-x-auto px-4 pb-4 scrollbar-thin sm:mx-0 sm:px-0">
                <div className="flex gap-4 sm:gap-6">
                  {newArrivalProducts.map((product: Product, i) => (
                    <Reveal
                      key={product.id}
                      delay={Math.min(i * 0.04, 0.25)}
                      className="w-[60vw] shrink-0 sm:w-72"
                    >
                      <ProductCard product={product} className="h-full" />
                    </Reveal>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* FINAL CTA                                                         */}
      {/* ----------------------------------------------------------------- */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-foreground px-6 py-16 text-center text-background sm:px-12 sm:py-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-grid opacity-[0.08] [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]"
            />
            <div className="relative flex flex-col items-center gap-6">
              <span className="text-xs uppercase tracking-luxe opacity-70">
                Begin
              </span>
              <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Considered objects, delivered.
              </h2>
              <p className="max-w-xl text-balance text-sm opacity-80 sm:text-base">
                Browse the full catalog — over two hundred objects, curated
                across twenty categories.
              </p>
              <Button
                asChild
                size="lg"
                className="gap-1.5 rounded-full bg-background px-6 text-foreground hover:bg-background/90"
              >
                <Link href="/products">
                  Browse the catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
