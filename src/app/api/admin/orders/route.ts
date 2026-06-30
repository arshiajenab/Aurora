import { NextResponse } from "next/server";
import { ordersService } from "@/services/orders.service";

/** GET /api/admin/orders — admin order list with filters. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("q") ?? undefined;
  try {
    const result = await ordersService.listForAdmin({
      page,
      limit,
      status: status && status !== "all" ? status : undefined,
      search: search || undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
