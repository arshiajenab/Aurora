import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Truck, RotateCcw, ShieldCheck, Minus } from "lucide-react";
import { productService } from "@/services/products.service";
import { formatCurrency, titleCaseSlug } from "@/lib/format";
import { SITE } from "@/lib/constants";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Reveal } from "@/shared/components/reveal";
import { SectionHeading } from "@/shared/components/section-heading";
import { ProductCard } from "@/features/products/components/product-card";
import { ProductGallery } from "@/features/products/components/product-gallery";
import { ProductActions } from "@/features/products/components/product-actions";
import {
  RecentlyViewedList,
} from "@/features/products/components/recently-viewed-list";
import { RecentlyViewedTracker } from "@/features/products/components/recently-viewed-tracker";

/**
 * /products/[id] — product detail.
 *
 * Server Component. Calls productService; on not-found, calls notFound() which
 * renders the closest not-found.tsx. Related products + recently-viewed are
 * rendered below; the latter is a client island reading the persisted store.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return { title: "Product" };
  }
  try {
    const product = await productService.getProduct(numericId);
    const title = `${product.title} — ${SITE.name}`;
    const description = product.description.slice(0, 160);
    return {
      title: product.title,
      description,
      alternates: { canonical: `/products/${product.id}` },
      openGraph: {
        type: "website",
        title,
        description,
        url: `${SITE.url}/products/${product.id}`,
        images: [
          {
            url: product.thumbnail,
            width: 600,
            height: 600,
            alt: product.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [product.thumbnail],
      },
    };
  } catch {
    return { title: "Product" };
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    notFound();
  }

  let product;
  try {
    product = await productService.getProduct(numericId);
  } catch {
    notFound();
  }

  // Related + recently-viewed prefetch (related is non-critical).
  const related = await productService.getRelated(product, 4);

  const discount = product.discountPercentage > 0;
  const outOfStock = product.stock <= 0;
  const lowStock = !outOfStock && product.stock <= 5;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Track this view (client side effect, no UI) */}
      <RecentlyViewedTracker product={product} />

      {/* Breadcrumbs */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/products">Products</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link
                href={`/products?category=${encodeURIComponent(product.category)}`}
              >
                {titleCaseSlug(product.category)}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{product.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Main: gallery + info */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* Gallery */}
        <Reveal>
          <ProductGallery images={product.images} alt={product.title} />
        </Reveal>

        {/* Info */}
        <Reveal delay={0.1}>
          <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
            {/* Header */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Link
                  href={`/products?category=${encodeURIComponent(product.category)}`}
                  className="text-xs uppercase tracking-luxe text-muted-foreground transition-colors hover:text-foreground"
                >
                  {titleCaseSlug(product.category)}
                </Link>
                {product.brand && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {product.brand}
                    </span>
                  </>
                )}
              </div>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                {product.title}
              </h1>

              {/* Rating + availability */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Star className="h-4 w-4 fill-current" />
                  {product.rating.toFixed(1)}
                  <span className="text-muted-foreground">
                    ({product.reviews.length} review
                    {product.reviews.length === 1 ? "" : "s"})
                  </span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={
                    outOfStock
                      ? "text-muted-foreground"
                      : lowStock
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }
                >
                  {outOfStock
                    ? "Sold out"
                    : lowStock
                      ? `Only ${product.stock} left`
                      : "In stock"}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(product.price)}
              </span>
              {discount && (
                <>
                  <span className="text-lg text-muted-foreground line-through tabular-nums">
                    {formatCurrency(product.priceBeforeDiscount)}
                  </span>
                  <Badge variant="secondary" className="rounded-full">
                    Save {Math.round(product.discountPercentage)}%
                  </Badge>
                </>
              )}
            </div>

            {/* Description */}
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>

            <Separator />

            {/* Actions */}
            <ProductActions product={product} />

            <Separator />

            {/* Trust band */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col items-center gap-1.5">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  Free over $250
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <RotateCcw className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  30-day returns
                </span>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span className="text-[11px] text-muted-foreground">
                  2-year warranty
                </span>
              </div>
            </div>

            <Separator />

            {/* Accordions */}
            <Accordion type="single" collapsible defaultValue="description" className="w-full">
              <AccordionItem value="description">
                <AccordionTrigger>Details</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  <p>{product.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <dt className="text-muted-foreground">SKU</dt>
                    <dd className="font-mono">{product.sku}</dd>
                    <dt className="text-muted-foreground">Weight</dt>
                    <dd>{product.weight} kg</dd>
                    <dt className="text-muted-foreground">Dimensions</dt>
                    <dd>
                      {product.dimensions.width} × {product.dimensions.height}{" "}
                      × {product.dimensions.depth} cm
                    </dd>
                    {product.brand && (
                      <>
                        <dt className="text-muted-foreground">Brand</dt>
                        <dd>{product.brand}</dd>
                      </>
                    )}
                    <dt className="text-muted-foreground">Min. order</dt>
                    <dd>{product.minimumOrderQuantity} units</dd>
                  </dl>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger>Shipping</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {product.shippingInformation}. Free carbon-neutral shipping on
                  orders over $250. Standard delivery 3–6 business days.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="returns">
                <AccordionTrigger>Returns &amp; warranty</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {product.returnPolicy}. {product.warrantyInformation}.
                </AccordionContent>
              </AccordionItem>
              {product.reviews.length > 0 && (
                <AccordionItem value="reviews">
                  <AccordionTrigger>
                    Reviews ({product.reviews.length})
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="flex flex-col gap-4">
                      {product.reviews.slice(0, 5).map((review, i) => (
                        <li key={i} className="flex flex-col gap-1.5 border-b pb-4 last:border-b-0 last:pb-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {review.reviewerName}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                              <Star className="h-3 w-3 fill-current" />
                              {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {review.comment}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>

            {/* Tags */}
            {product.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Minus className="h-3 w-3 text-muted-foreground" />
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section className="mt-20">
          <SectionHeading
            eyebrow="You may also like"
            title="Related objects"
            description={`More from ${titleCaseSlug(product.category)}.`}
          />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {related.map((p, i) => (
              <Reveal
                key={p.id}
                delay={Math.min(i * 0.05, 0.3)}
                className="h-full"
              >
                <ProductCard product={p} className="h-full" />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <section className="mt-20">
        <SectionHeading
          eyebrow="Continue browsing"
          title="Recently viewed"
        />
        <div className="mt-8">
          <RecentlyViewedList
            currentProductId={product.id}
            products={related}
          />
        </div>
      </section>
    </div>
  );
}
