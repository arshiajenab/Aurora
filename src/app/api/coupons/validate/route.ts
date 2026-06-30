import { NextResponse } from "next/server";
import { couponsService, CouponsServiceError } from "@/services/coupons.service";
import { couponValidateSchema } from "@/lib/validations";

/** POST /api/coupons/validate — validate a coupon against a subtotal. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = couponValidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const result = await couponsService.validate(
      parsed.data.code,
      parsed.data.subtotal,
    );
    return NextResponse.json({ coupon: result });
  } catch (err) {
    if (err instanceof CouponsServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
