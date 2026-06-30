import { NextResponse } from "next/server";
import { productService } from "@/services/products.service";

/** GET /api/categories */
export async function GET() {
  try {
    const categories = await productService.getCategories();
    return NextResponse.json(categories, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
