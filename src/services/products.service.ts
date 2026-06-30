/**
 * Products service — DB-backed (Mongoose + MongoDB), seeded from DummyJSON.
 *
 * The PUBLIC interface is intentionally identical to the previous versions,
 * so every storefront page keeps working unchanged. Full CRUD for admin.
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import type {
  Paginated,
  Product,
  ProductCategory,
  ProductQuery,
  SortOption,
} from "@/types";
import type { ProductDoc } from "@/lib/models";
import mongoose from "mongoose";

/* ---------------- Wire → domain mapper ---------------- */

function mapProduct(row: ProductDoc): Product {
  const tags: string[] = Array.isArray(row.tags) ? row.tags : [];
  const images: string[] = Array.isArray(row.images) ? row.images : [];
  const discountPercentage = row.discountPercentage ?? 0;
  const priceBeforeDiscount =
    discountPercentage > 0
      ? Number((row.price / (1 - discountPercentage / 100)).toFixed(2))
      : row.price;
  const createdAt =
    row.createdAt instanceof Date
      ? row.createdAt
      : new Date(row.createdAt ?? Date.now());
  const updatedAt =
    row.updatedAt instanceof Date
      ? row.updatedAt
      : new Date(row.updatedAt ?? Date.now());
  return {
    id: row._id,
    title: row.title,
    description: row.description ?? "",
    category: row.category,
    price: Number(Number(row.price).toFixed(2)),
    priceBeforeDiscount,
    discountPercentage,
    rating: row.rating ?? 0,
    stock: row.stock ?? 0,
    tags,
    brand: row.brand ?? null,
    sku: row.sku ?? "",
    weight: row.weight ?? 0,
    dimensions: {
      width: row.width ?? 0,
      height: row.height ?? 0,
      depth: row.depth ?? 0,
    },
    warrantyInformation: row.warrantyInformation ?? "",
    shippingInformation: row.shippingInformation ?? "",
    availabilityStatus: row.availabilityStatus ?? "In Stock",
    reviews: [],
    returnPolicy: row.returnPolicy ?? "30 days return policy",
    minimumOrderQuantity: row.minimumOrderQuantity ?? 1,
    meta: {
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
      barcode: "",
      qrCode: "",
    },
    thumbnail: row.thumbnail,
    images: images.length > 0 ? images : [row.thumbnail],
    featured: row.featured ?? false,
    status: (row.status as "active" | "inactive") ?? "active",
  };
}

function translateSort(sortBy?: SortOption): {
  field: "price" | "rating" | "title" | "createdAt";
  order: 1 | -1;
} {
  switch (sortBy) {
    case "price-asc":
      return { field: "price", order: 1 };
    case "price-desc":
      return { field: "price", order: -1 };
    case "rating-desc":
      return { field: "rating", order: -1 };
    case "title-asc":
      return { field: "title", order: 1 };
    case "newest":
      return { field: "createdAt", order: -1 };
    case "featured":
    default:
      return { field: "createdAt", order: -1 };
  }
}

/** Build a Mongoose filter from the query params. */
function buildFilter(query: {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  activeOnly?: boolean;
}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  if (query.activeOnly) filter.status = "active";
  if (query.category && query.category !== "all") filter.category = query.category;
  if (query.search) {
    const re = new RegExp(escapeRegex(query.search), "i");
    filter.$or = [{ title: re }, { description: re }, { brand: re }];
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.price = {};
    if (query.minPrice !== undefined) (filter.price as Record<string, unknown>).$gte = query.minPrice;
    if (query.maxPrice !== undefined) (filter.price as Record<string, unknown>).$lte = query.maxPrice;
  }
  return filter;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Ensure the DB is connected before any query (idempotent). */
async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
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

/* ---------------- Public read API ---------------- */

export const productService = {
  async getProducts(query: ProductQuery = {}): Promise<Paginated<Product>> {
    await ensureConn();
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
    const filter = buildFilter({
      search,
      category,
      minPrice,
      maxPrice,
      activeOnly: true,
    });

    const [total, rows] = await Promise.all([
      db.product.countDocuments(filter),
      db.product
        .find(filter)
        .sort({ [field]: order })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: (rows as ProductDoc[]).map(mapProduct),
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
    await ensureConn();
    const row = (await db.product.findById(id).lean()) as ProductDoc | null;
    if (!row) {
      throw new ProductServiceError(`Product ${id} not found`, "not-found", 404);
    }
    return mapProduct(row);
  },

  async getCategories(): Promise<ProductCategory[]> {
    await ensureConn();
    const categories = await db.category.find().sort({ name: 1 }).limit(12).lean();
    // Attach a representative image (top-rated product thumbnail in each category).
    const withImages = await Promise.all(
      (categories as CategoryLean[]).map(async (cat) => {
        const sample = (await db.product
          .findOne({ category: cat._id, status: "active" })
          .sort({ rating: -1 })
          .select("thumbnail")
          .lean()) as { thumbnail: string } | null;
        return {
          slug: cat._id,
          name: cat.name,
          image: sample?.thumbnail ?? cat.image ?? "",
        };
      }),
    );
    return withImages;
  },

  async getFeatured(limit = 8): Promise<Product[]> {
    await ensureConn();
    const rows = (await db.product
      .find({ status: "active", featured: true })
      .sort({ rating: -1 })
      .limit(limit)
      .lean()) as ProductDoc[];
    if (rows.length > 0) return rows.map(mapProduct);
    // Fallback: top-rated if no featured flag set.
    const fallback = (await db.product
      .find({ status: "active" })
      .sort({ rating: -1 })
      .limit(limit)
      .lean()) as ProductDoc[];
    return fallback.map(mapProduct);
  },

  async getNewArrivals(limit = 8): Promise<Product[]> {
    await ensureConn();
    const rows = (await db.product
      .find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()) as ProductDoc[];
    return rows.map(mapProduct);
  },

  async getRelated(product: Product, limit = 4): Promise<Product[]> {
    await ensureConn();
    const rows = (await db.product
      .find({ category: product.category, status: "active", _id: { $ne: product.id } })
      .sort({ rating: -1 })
      .limit(limit)
      .lean()) as ProductDoc[];
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
    await ensureConn();
    const { page = 1, limit = 20, search, category, status } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: re }, { sku: re }, { brand: re }];
    }
    if (category && category !== "all") filter.category = category;
    if (status && status !== "all") filter.status = status;

    const [total, rows] = await Promise.all([
      db.product.countDocuments(filter),
      db.product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      items: (rows as ProductDoc[]).map(mapProduct),
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
    await ensureConn();
    // Compute next numeric id (MongoDB can't autoincrement).
    const last = (await db.product.findOne().sort({ _id: -1 }).lean()) as ProductDoc | null;
    const nextId = (last?._id ?? 0) + 1;

    const row = (await db.product.create({
      _id: nextId,
      title: input.title,
      description: input.description,
      category: input.category,
      price: input.price,
      discountPercentage: input.discountPercentage,
      stock: input.stock,
      tags: input.tags,
      brand: input.brand ?? null,
      sku: input.sku ?? null,
      thumbnail: input.thumbnail,
      images: input.images,
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
    })) as ProductDoc;
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
    await ensureConn();
    const data: Record<string, unknown> = { ...input };
    if (input.stock !== undefined) {
      data.availabilityStatus = input.stock > 0 ? "In Stock" : "Out of Stock";
    }
    const row = (await db.product
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()) as ProductDoc | null;
    if (!row) {
      throw new ProductServiceError(`Product ${id} not found`, "not-found", 404);
    }
    return mapProduct(row);
  },

  async deleteProduct(id: number): Promise<void> {
    await ensureConn();
    const result = await db.product.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      throw new ProductServiceError(`Product ${id} not found`, "not-found", 404);
    }
  },
};

/* ---------------- helpers ---------------- */

interface CategoryLean {
  _id: string;
  name: string;
  image?: string | null;
}
