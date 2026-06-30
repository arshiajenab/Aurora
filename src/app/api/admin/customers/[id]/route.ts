import { NextResponse } from "next/server";
import { adminService } from "@/services/admin.service";

/** GET /api/admin/customers/[id] — customer detail with order history. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const detail = await adminService.getCustomerDetail(id);
    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
}
