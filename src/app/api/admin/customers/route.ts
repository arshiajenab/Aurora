import { NextResponse } from "next/server";
import { adminService } from "@/services/admin.service";

/** GET /api/admin/customers — list registered customers with order stats. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 20);
  const search = searchParams.get("q") ?? undefined;
  try {
    const result = await adminService.getCustomers({
      page,
      limit,
      search: search || undefined,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
