import { NextResponse } from "next/server";
import { ordersService, OrdersServiceError } from "@/services/orders.service";
import { orderStatusSchema } from "@/lib/validations";

/**
 * PATCH /api/orders/[id]/status — admin updates order status.
 * Admin panel is intentionally unauthenticated per spec.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = orderStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const order = await ordersService.updateStatus(id, parsed.data.status);
    return NextResponse.json(order);
  } catch (err) {
    if (err instanceof OrdersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
