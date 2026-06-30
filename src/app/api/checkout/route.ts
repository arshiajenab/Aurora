import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validations";
import { productService } from "@/services/products.service";
import { generateOrderId } from "@/lib/format";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import type { Order } from "@/types";

/**
 * POST /api/checkout
 *
 * Mock checkout: validates the payload, "looks up" live product prices from
 * the catalog (so the client can't forge prices), computes totals with our
 * server-side constants, and returns a persisted-feeling order object.
 *
 * In production this would write to a DB + delegate payment to a gateway.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { items, customer } = parsed.data;

  // Resolve live prices from the catalog. We fetch each product; for a real
  // backend this would be a single batched query.
  const resolved = await Promise.all(
    items.map(async (line) => {
      try {
        const product = await productService.getProduct(line.id);
        return {
          productId: product.id,
          title: product.title,
          price: product.price,
          quantity: line.quantity,
          thumbnail: product.thumbnail,
        };
      } catch {
        return null;
      }
    }),
  );

  const orderItems = resolved.filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );

  if (orderItems.length !== items.length) {
    return NextResponse.json(
      { error: "One or more products are no longer available" },
      { status: 409 },
    );
  }

  const subtotal = Number(
    orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2),
  );
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + shipping + tax).toFixed(2));

  const order: Order = {
    id: generateOrderId(),
    createdAt: new Date().toISOString(),
    status: "pending",
    items: orderItems,
    subtotal,
    shipping,
    tax,
    total,
    customer,
  };

  return NextResponse.json(order, { status: 201 });
}
