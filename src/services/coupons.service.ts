/**
 * Coupons service — validation + discount computation.
 */
import { db } from "@/lib/db";

export class CouponsServiceError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "CouponsServiceError";
  }
}

export interface CouponResult {
  code: string;
  type: "percent" | "fixed";
  value: number;
  discount: number;
  minSubtotal: number;
}

export const couponsService = {
  async validate(
    code: string,
    subtotal: number,
  ): Promise<CouponResult> {
    const coupon = await db.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });
    if (!coupon || !coupon.active) {
      throw new CouponsServiceError("Invalid coupon code", 400);
    }
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new CouponsServiceError("This coupon has expired", 400);
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new CouponsServiceError("This coupon has been fully redeemed", 400);
    }
    if (subtotal < coupon.minSubtotal) {
      throw new CouponsServiceError(
        `Requires a minimum subtotal of $${coupon.minSubtotal.toFixed(2)}`,
        400,
      );
    }
    const discount =
      coupon.type === "percent"
        ? Number(((subtotal * coupon.value) / 100).toFixed(2))
        : Math.min(Number(coupon.value.toFixed(2)), subtotal);
    return {
      code: coupon.code,
      type: coupon.type as "percent" | "fixed",
      value: coupon.value,
      discount,
      minSubtotal: coupon.minSubtotal,
    };
  },
};
