/**
 * Coupons service — validation + discount computation (Mongoose).
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import mongoose from "mongoose";

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

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

export const couponsService = {
  async validate(code: string, subtotal: number): Promise<CouponResult> {
    await ensureConn();
    const coupon = (await db.coupon
      .findOne({ code: code.toUpperCase() })
      .lean()) as {
      active: boolean;
      expiresAt: Date | null;
      usageLimit: number | null;
      usedCount: number;
      minSubtotal: number;
      type: string;
      value: number;
      code: string;
    } | null;
    if (!coupon || !coupon.active) {
      throw new CouponsServiceError("Invalid coupon code", 400);
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
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
