import { NextResponse } from "next/server";
import { productService, ProductServiceError } from "@/services/products.service";

/**
 * GET /api/products/[id]
 * Revalidate cached for 5 min; 404 maps cleanly to a not-found response.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json(
      { error: "Invalid product id" },
      { status: 400 },
    );
  }

  try {
    const product = await productService.getProduct(numericId);
    return NextResponse.json(product, {
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
