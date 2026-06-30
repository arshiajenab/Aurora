import type { MetadataRoute } from "next";
import { SITE } from "@/lib/constants";
import { productService } from "@/services/products.service";

// Sitemap fetches from the DB — render on-demand, not at build time.
export const dynamic = "force-dynamic";

/**
 * Dynamic sitemap — static marketing routes + every product detail page.
 * Generated at request time; cached for 1h via the route's default cache.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE.url}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/categories`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE.url}/wishlist`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Product detail routes — paginate through the catalog.
  const productRoutes: MetadataRoute.Sitemap = [];
  try {
    const { items } = await productService.getProducts({
      page: 1,
      limit: 100,
      sortBy: "newest",
    });
    for (const product of items) {
      productRoutes.push({
        url: `${SITE.url}/products/${product.id}`,
        lastModified: new Date(product.meta.updatedAt),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    // Sitemap is best-effort; degrade to static routes only.
  }

  return [...staticRoutes, ...productRoutes];
}
