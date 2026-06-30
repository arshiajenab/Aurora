import { NextResponse } from "next/server";
import { ordersService, OrdersServiceError } from "@/services/orders.service";
import { requireSession } from "@/lib/session";
import { checkoutSchema } from "@/lib/validations";

/**
 * POST /api/orders  (replaces the old /api/checkout — kept for compat too).
 * Creates a real order: validates stock, computes totals, decrements stock,
 * applies coupon. Requires authentication.
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

/** GET /api/orders — current user's orders. */
export async function GET(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") ?? 1);
  const limit = Number(searchParams.get("limit") ?? 10);
  const status = searchParams.get("status") ?? undefined;
  try {
    const result = await ordersService.listForUser(session.user.id, {
      page,
      limit,
      status: status && status !== "all" ? status : undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof OrdersServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
