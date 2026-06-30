/**
 * Products service — now DB-backed (Prisma + SQLite), seeded from DummyJSON.
 *
 * The PUBLIC interface is intentionally identical to the previous
 * DummyJSON-backed version, so every storefront page keeps working
 * unchanged. The only difference: data now persists locally and supports
 * full CRUD (see the admin methods below).
 *
 * JSON-encoded fields (tags, images) are normalised to arrays on read.
 */
import { db } from "@/lib/db";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import type {
  Paginated,
  Product,
  ProductCategory,
  ProductQuery,
  SortOption,
} from "@/types";

/* ---------------- Wire → domain mapper ---------------- */

type ProductRow = Awaited<ReturnType<typeof db.product.findFirst>> & object;

function mapProduct(row: ProductRow): Product {
  const tags: string[] = safeParseArray(row.tags);
  const images: string[] = safeParseArray(row.images);
  const discountPercentage = row.discountPercentage ?? 0;
  const priceBeforeDiscount =
    discountPercentage > 0
      ? Number((row.price / (1 - discountPercentage / 100)).toFixed(2))
      : row.price;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    price: Number(row.price.toFixed(2)),
    priceBeforeDiscount,
    discountPercentage,
    rating: row.rating,
    stock: row.stock,
    tags,
    brand: row.brand,
    sku: row.sku ?? "",
    weight: row.weight,
    dimensions: {
      width: row.width,
      height: row.height,
      depth: row.depth,
    },
    warrantyInformation: row.warrantyInformation,
    shippingInformation: row.shippingInformation,
    availabilityStatus: row.availabilityStatus,
    reviews: [],
    returnPolicy: row.returnPolicy,
    minimumOrderQuantity: row.minimumOrderQuantity,
    meta: {
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      barcode: "",
      qrCode: "",
    },
    thumbnail: row.thumbnail,
    images: images.length > 0 ? images : [row.thumbnail],
    featured: row.featured,
    status: row.status as "active" | "inactive",
  };
}

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function translateSort(sortBy?: SortOption): {
  field: "price" | "rating" | "title" | "createdAt";
  order: "asc" | "desc";
} {
  switch (sortBy) {
    case "price-asc":
      return { field: "price", order: "asc" };
    case "price-desc":
      return { field: "price", order: "desc" };
    case "rating-desc":
      return { field: "rating", order: "desc" };
    case "title-asc":
      return { field: "title", order: "asc" };
    case "newest":
      return { field: "createdAt", order: "desc" };
    case "featured":
    default:
      return { field: "createdAt", order: "desc" };
  }
}

/* ---------------- Errors ---------------- */

export class ProductServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "validation" | "internal",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ProductServiceError";
  }
}

/* ---------------- Public read API (unchanged interface) ---------------- */

export const productService = {
  async getProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
    const {
      search,
      category,
      sortBy = "featured",
      page = 1,
      limit = PRODUCTS_PER_PAGE,
      minPrice,
      maxPrice,
    } = query;

    const { field, order } = translateSort(sortBy);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { status: "active" };
    if (category && category !== "all") where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Record<string, unknown>).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Record<string, unknown>).lte = maxPrice;
    }

    const [total, rows] = await Promise.all([
      db.product.count({ where: where as never }),
      db.product.findMany({
        where: where as never,
        orderBy: { [field]: order },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: rows.map(mapProduct),
      total,
      skip,
      limit,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async getProduct(id: number): Promise<Product> {
    const row = await db.product.findUnique({ where: { id } });
    if (!row) {
      throw new ProductServiceError(`Product ${id} not found`, "not-found", 404);
    }
    return mapProduct(row);
  },

  async getCategories(): Promise<ProductCategory[]> {
    const categories = await db.category.findMany({
      orderBy: { name: "asc" },
      take: 12,
    });
    // Attach a representative image (first product thumbnail in the category).
    const withImages = await Promise.all(
      categories.map(async (cat) => {
        const sample = await db.product.findFirst({
          where: { category: cat.slug, status: "active" },
          orderBy: { rating: "desc" },
          select: { thumbnail: true },
        });
        return {
          slug: cat.slug,
          name: cat.name,
          image: sample?.thumbnail ?? cat.image ?? "",
        };
      }),
    );
    return withImages;
  },

  async getFeatured(limit = 8): Promise<Product[]> {
    const rows = await db.product.findMany({
      where: { status: "active", featured: true },
      orderBy: { rating: "desc" },
      take: limit,
    });
    if (rows.length > 0) return rows.map(mapProduct);
    // Fallback: top-rated if no featured flag set.
    const fallback = await db.product.findMany({
      where: { status: "active" },
      orderBy: { rating: "desc" },
      take: limit,
    });
    return fallback.map(mapProduct);
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    const rows = await db.product.findMany({
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(mapProduct);
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    const rows = await db.product.findMany({
      where: {
        category: product.category,
        status: "active",
        id: { not: product.id },
      },
      orderBy: { rating: "desc" },
      take: limit,
    });
    return rows.map(mapProduct);
  },

  /* ---------------- Admin CRUD ---------------- */

  async listAllForAdmin(params: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }): Promise<Paginated<Product>> {
    const { page = 1, limit = 20, search, category, status } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { sku: { contains: search } },
        { brand: { contains: search } },
      ];
    }
    if (category && category !== "all") where.category = category;
    if (status && status !== "all") where.status = status;

    const [total, rows] = await Promise.all([
      db.product.count({ where: where as never }),
      db.product.findMany({
        where: where as never,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: rows.map(mapProduct),
      total,
      skip,
      limit,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async createProduct(input: {
    title: string;
    description: string;
    category: string;
    price: number;
    discountPercentage: number;
    stock: number;
    tags: string[];
    brand?: string | null;
    sku?: string | null;
    thumbnail: string;
    images: string[];
    featured: boolean;
    status: "active" | "inactive";
    warrantyInformation?: string;
    shippingInformation?: string;
    returnPolicy?: string;
    minimumOrderQuantity?: number;
    weight?: number;
    width?: number;
    height?: number;
    depth?: number;
  }): Promise<Product> {
    const row = await db.product.create({
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        price: input.price,
        discountPercentage: input.discountPercentage,
        stock: input.stock,
        tags: JSON.stringify(input.tags),
        brand: input.brand ?? null,
        sku: input.sku ?? null,
        thumbnail: input.thumbnail,
        images: JSON.stringify(input.images),
        featured: input.featured,
        status: input.status,
        warrantyInformation: input.warrantyInformation ?? "",
        shippingInformation: input.shippingInformation ?? "",
        returnPolicy: input.returnPolicy ?? "30 days return policy",
        minimumOrderQuantity: input.minimumOrderQuantity ?? 1,
        weight: input.weight ?? 0,
        width: input.width ?? 0,
        height: input.height ?? 0,
        depth: input.depth ?? 0,
        rating: 0,
        availabilityStatus: input.stock > 0 ? "In Stock" : "Out of Stock",
      },
    });
    return mapProduct(row);
  },

  async updateProduct(
    id: number,
    input: Partial<{
      title: string;
      description: string;
      category: string;
      price: number;
      discountPercentage: number;
      stock: number;
      tags: string[];
      brand: string | null;
      sku: string | null;
      thumbnail: string;
      images: string[];
      featured: boolean;
      status: "active" | "inactive";
      warrantyInformation: string;
      shippingInformation: string;
      returnPolicy: string;
      minimumOrderQuantity: number;
    }>,
  ): Promise<Product> {
    const data: Record<string, unknown> = { ...input };
    if (input.tags) data.tags = JSON.stringify(input.tags);
    if (input.images) data.images = JSON.stringify(input.images);
    if (input.stock !== undefined) {
      data.availabilityStatus = input.stock > 0 ? "In Stock" : "Out of Stock";
    }
    try {
      const row = await db.product.update({ where: { id }, data: data as never });
      return mapProduct(row);
    } catch {
      throw new ProductServiceError(
        `Product ${id} not found`,
        "not-found",
        404,
      );
    }
  },

  async deleteProduct(id: number): Promise<void> {
    try {
      await db.product.delete({ where: { id } });
    } catch {
      throw new ProductServiceError(
        `Product ${id} not found`,
        "not-found",
        404,
      );
    }
  },
};
