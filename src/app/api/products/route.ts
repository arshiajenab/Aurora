import { NextResponse } from "next/server";
import { productService, ProductServiceError } from "@/services/products.service";
import { productQuerySchema } from "@/lib/validations";

/**
 * GET /api/products
 * Public product listing endpoint. Validates query, delegates to the
 * service layer, maps service errors to HTTP status codes.
 *
 * Cache: 5 min on the client, 5 min on the server (s-maxage). The service
 * layer also sets Next's `revalidate`, but we tag the response here too so
 * ISR revalidation can be triggered centrally.
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
      headers: {
        "Cache-Control":
          "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    if (err instanceof ProductServiceError) {
      const status =
        err.code === "not-found"
          ? 404
          : err.code === "timeout"
            ? 504
            : err.code === "api"
              ? err.status ?? 502
              : 503;
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
