import { NextResponse } from "next/server";
import { productService } from "@/services/products.service";
import { adminProductQuerySchema } from "@/lib/validations";

/** GET /api/admin/products — admin product list (includes inactive). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = adminProductQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    q: searchParams.get("q") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query parameters", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  try {
    const result = await productService.listAllForAdmin({
      page: parsed.data.page,
      limit: parsed.data.limit,
      search: parsed.data.q,
      category: parsed.data.category,
      status: parsed.data.status,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
