import { NextResponse } from "next/server";
import { ordersService, OrdersServiceError } from "@/services/orders.service";
import { requireSession } from "@/lib/session";

/** GET /api/orders/[id] — order detail (owner only). */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { id } = await params;
  try {
    const order = await ordersService.getById(id, session.user.id);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof OrdersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
