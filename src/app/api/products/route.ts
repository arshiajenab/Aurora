import { NextResponse } from "next/server";
import { productService, ProductServiceError } from "@/services/products.service";
import { productQuerySchema, createProductSchema } from "@/lib/validations";

/**
 * GET /api/products
 * Public catalog listing. Cached 5 min server-side.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = productQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const result = await productService.getProducts({
      search: parsed.data.q,
      category: parsed.data.category,
      sortBy: parsed.data.sortBy,
      page: parsed.data.page,
      limit: parsed.data.limit,
      minPrice: parsed.data.minPrice,
      maxPrice: parsed.data.maxPrice,
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Admin-only creation (admin panel is unauthenticated per spec, so this is
 * intentionally open — in production you'd gate it behind an admin role).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const product = await productService.createProduct({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      price: parsed.data.price,
      discountPercentage: parsed.data.discountPercentage,
      stock: parsed.data.stock,
      tags: parsed.data.tags,
      brand: parsed.data.brand,
      sku: parsed.data.sku,
      thumbnail: parsed.data.thumbnail,
      images: parsed.data.images,
      featured: parsed.data.featured,
      status: parsed.data.status,
      warrantyInformation: parsed.data.warrantyInformation,
      shippingInformation: parsed.data.shippingInformation,
      returnPolicy: parsed.data.returnPolicy,
      minimumOrderQuantity: parsed.data.minimumOrderQuantity,
      weight: parsed.data.weight,
      width: parsed.data.width,
      height: parsed.data.height,
      depth: parsed.data.depth,
    });
    return NextResponse.json(product, { status: 201 });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
