import { NextResponse } from "next/server";
import { ordersService, OrdersServiceError } from "@/services/orders.service";
import { requireSession } from "@/lib/session";
import { checkoutSchema } from "@/lib/validations";

/**
 * POST /api/checkout — legacy alias kept for backward compatibility.
 * New code should POST to /api/orders. Requires authentication.
 */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const order = await ordersService.createOrder({
      userId: session.user.id,
      items: parsed.data.items,
      customer: parsed.data.customer,
      shippingAddress: parsed.data.shippingAddress,
      billingAddress: parsed.data.billingAddress,
      shippingMethod: parsed.data.shippingMethod,
      paymentMethod: parsed.data.paymentMethod,
      couponCode: parsed.data.couponCode,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    if (err instanceof OrdersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
