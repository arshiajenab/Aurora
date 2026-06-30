/**
 * Products service — the ONLY place that knows about DummyJSON's wire format.
 *
 * Why this exists as an isolated module:
 *  - The UI depends on our domain `Product` type, never on the API shape.
 *  - Swapping to a real backend means rewriting this file alone.
 *  - Retry / timeout / error mapping live in `apiClient`, kept DRY.
 *
 * All functions are safe to call from Server Components and Route Handlers
 * (they run on the server, where `NEXT_PUBLIC_*` is irrelevant).
 */

import { apiFetch, ApiError, NetworkError, TimeoutError } from "@/lib/api-client";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import type {
  Paginated,
  Product,
  ProductCategory,
  ProductQuery,
  SortOption,
} from "@/types";

const BASE_URL = "https://dummyjson.com";

/* ---------------- Wire-format (DummyJSON) ---------------- */

interface DummyImageResponse {
  products: { id: number; thumbnail: string }[];
  total: number;
  skip: number;
  limit: number;
}

interface DummyProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  weight: number;
  dimensions: { width: number; height: number; depth: number };
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: {
    rating: number;
    comment: string;
    date: string;
    reviewerName: string;
    reviewerEmail: string;
  }[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: { createdAt: string; updatedAt: string; barcode: string; qrCode: string };
  thumbnail: string;
  images: string[];
}

interface DummyProductsResponse {
  products: DummyProduct[];
  total: number;
  skip: number;
  limit: number;
}

interface DummyCategory {
  slug: string;
  name: string;
  url: string;
}

/* ---------------- Mappers ---------------- */

function mapProduct(raw: DummyProduct): Product {
  const price = Number(raw.price.toFixed(2));
  const discountPercentage = raw.discountPercentage ?? 0;
  const priceBeforeDiscount =
    discountPercentage > 0
      ? Number((price / (1 - discountPercentage / 100)).toFixed(2))
      : price;
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    category: raw.category,
    price,
    priceBeforeDiscount,
    discountPercentage,
    rating: raw.rating,
    stock: raw.stock,
    tags: raw.tags ?? [],
    brand: raw.brand ?? null,
    sku: raw.sku,
    weight: raw.weight,
    dimensions: raw.dimensions,
    warrantyInformation: raw.warrantyInformation,
    shippingInformation: raw.shippingInformation,
    availabilityStatus: raw.availabilityStatus,
    reviews: raw.reviews ?? [],
    returnPolicy: raw.returnPolicy,
    minimumOrderQuantity: raw.minimumOrderQuantity,
    meta: raw.meta,
    thumbnail: raw.thumbnail,
    images: raw.images ?? [raw.thumbnail],
  };
}

/* ---------------- Query translation ---------------- */

function translateSort(sortBy?: SortOption): {
  sortBy?: string;
  order?: "asc" | "desc";
} {
  switch (sortBy) {
    case "price-asc":
      return { sortBy: "price", order: "asc" };
    case "price-desc":
      return { sortBy: "price", order: "desc" };
    case "rating-desc":
      return { sortBy: "rating", order: "desc" };
    case "title-asc":
      return { sortBy: "title", order: "asc" };
    case "newest":
      return { sortBy: "meta.createdAt", order: "desc" };
    case "featured":
    default:
      return {};
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    sp.set(key, String(value));
  }
  const str = sp.toString();
  return str ? `?${str}` : "";
}

/* ---------------- Public API ---------------- */

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "network" | "timeout" | "api" | "not-found",
    public readonly status?: number,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

function wrapError(err: unknown, context: string): never {
  if (err instanceof ApiError && err.status === 404) {
    throw new ProductServiceError(`Not found: ${context}`, "not-found", 404);
  }
  if (err instanceof TimeoutError) {
    throw new ProductServiceError(err.message, "timeout");
  }
  if (err instanceof ApiError) {
    throw new ProductServiceError(
      `${context} failed: ${err.message}`,
      "api",
      err.status,
    );
  }
  if (err instanceof NetworkError) {
    throw new ProductServiceError(`${context} failed: ${err.message}`, "network");
  }
  throw new ProductServiceError(
    `${context} failed: ${err instanceof Error ? err.message : "unknown error"}`,
    "network",
  );
}

export const productService = {
  /** Fetch a paginated, filtered, sorted list of products. */
  async getProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
    const {
      search,
      category,
      sortBy = "featured",
      page = 1,
      limit = PRODUCTS_PER_PAGE,
    } = query;

    const { sortBy: apiSort, order } = translateSort(sortBy);
    const skip = (page - 1) * limit;

    try {
      let path: string;
      let params: Record<string, unknown>;

      if (search) {
        path = `${BASE_URL}/products/search`;
        params = { q: search, limit, skip, sortBy: apiSort, order };
      } else if (category && category !== "all") {
        path = `${BASE_URL}/products/category/${encodeURIComponent(category)}`;
        params = { limit, skip, sortBy: apiSort, order };
      } else {
        path = `${BASE_URL}/products`;
        params = { limit, skip, sortBy: apiSort, order };
      }

      const data = await apiFetch<DummyProductsResponse>(
        `${path}${buildQueryString(params)}`,
        { next: { revalidate: 300, tags: ["products"] } },
      );

      let items = data.products.map(mapProduct);

      // DummyJSON doesn't filter by price server-side, so we apply price
      // bounds client-side on the page slice. Acceptable for a demo data
      // source; the real backend would handle this.
      if (query.minPrice !== undefined || query.maxPrice !== undefined) {
        items = items.filter((p) => {
          if (query.minPrice !== undefined && p.price < query.minPrice)
            return false;
          if (query.maxPrice !== undefined && p.price > query.maxPrice)
            return false;
          return true;
        });
      }
      if (query.tags && query.tags.length > 0) {
        items = items.filter((p) =>
          query.tags!.some((t) => p.tags.includes(t)),
        );
      }

      const totalPages = Math.max(1, Math.ceil(data.total / limit));
      return {
        items,
        total: data.total,
        skip: data.skip,
        limit: data.limit,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };
    } catch (err) {
      wrapError(err, "getProducts");
    }
  },

  /** Fetch a single product by id. */
  async getProduct(id: number): Promise<Product> {
    try {
      const data = await apiFetch<DummyProduct>(`${BASE_URL}/products/${id}`, {
        next: { revalidate: 300, tags: [`product-${id}`] },
      });
      return mapProduct(data);
    } catch (err) {
      wrapError(err, `getProduct(${id})`);
    }
  },

  /** Fetch all product categories with representative images. */
  async getCategories(): Promise<ProductCategory[]> {
    try {
      const categories = await apiFetch<DummyCategory[]>(
        `${BASE_URL}/products/categories`,
        { next: { revalidate: 3600, tags: ["categories"] } },
      );
      // Grab one thumbnail per category to render the gallery tiles.
      const withImages = await Promise.all(
        categories.slice(0, 8).map(async (cat) => {
          try {
            const sample = await apiFetch<DummyImageResponse>(
              `${BASE_URL}/products/category/${encodeURIComponent(
                cat.slug,
              )}?limit=1&select=thumbnail`,
              { next: { revalidate: 3600, tags: ["categories"] } },
            );
            return {
              slug: cat.slug,
              name: cat.name,
              image:
                sample.products[0]?.thumbnail ??
                `/images/categories/${cat.slug}.jpg`,
            };
          } catch {
            return {
              slug: cat.slug,
              name: cat.name,
              image: `/images/categories/${cat.slug}.jpg`,
            };
          }
        }),
      );
      return withImages;
    } catch (err) {
      wrapError(err, "getCategories");
    }
  },

  /** Featured products — highest rated, in stock. */
  async getFeatured(limit = 8): Promise<Product[]> {
    try {
      const data = await apiFetch<DummyProductsResponse>(
        `${BASE_URL}/products?limit=${limit}&skip=0&sortBy=rating&order=desc`,
        { next: { revalidate: 300, tags: ["products", "featured"] } },
      );
      return data.products.map(mapProduct);
    } catch (err) {
      wrapError(err, "getFeatured");
    }
  },

  /** Recently-added products for the "New arrivals" rail. */
  async getNewArrivals(limit = 8): Promise<Product[]> {
    try {
      const data = await apiFetch<DummyProductsResponse>(
        `${BASE_URL}/products?limit=${limit}&skip=0&sortBy=meta.createdAt&order=desc`,
        { next: { revalidate: 300, tags: ["products", "new"] } },
      );
      return data.products.map(mapProduct);
    } catch (err) {
      wrapError(err, "getNewArrivals");
    }
  },

  /** Related products: same category, excluding the current product. */
  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    try {
      const data = await apiFetch<DummyProductsResponse>(
        `${BASE_URL}/products/category/${encodeURIComponent(
          product.category,
        )}?limit=${limit + 1}&skip=0`,
        { next: { revalidate: 300, tags: ["products"] } },
      );
      return data.products
        .map(mapProduct)
        .filter((p) => p.id !== product.id)
        .slice(0, limit);
    } catch (err) {
      // Related products are non-critical — degrade gracefully to empty list.
      return [];
    }
  },
};
