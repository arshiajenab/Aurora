/**
 * Compare service — persisted per-user compare list (up to 4 items, Mongoose).
 * Mirrors the wishlist pattern: client store for instant UX, DB sync when
 * authenticated.
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import { productService } from "@/services/products.service";
import type { Product } from "@/types";
import mongoose from "mongoose";

export const MAX_COMPARE = 4;

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

export const compareService = {
  async list(userId: string): Promise<Product[]> {
    await ensureConn();
    const rows = (await db.compareItem
      .find({ userId })
      .sort({ createdAt: 1 })
      .lean()) as { productId: number }[];
    const products = await Promise.all(
      rows.map((r) => productService.getProduct(r.productId).catch(() => null)),
    );
    return products.filter((p): p is Product => p !== null);
  },

  async listIds(userId: string): Promise<number[]> {
    await ensureConn();
    const rows = (await db.compareItem
      .find({ userId })
      .lean()) as { productId: number }[];
    return rows.map((r) => r.productId);
  },

  async add(userId: string, productId: number): Promise<void> {
    await ensureConn();
    const product = await productService.getProduct(productId).catch(() => null);
    if (!product) return;
    const count = await db.compareItem.countDocuments({ userId });
    if (count >= MAX_COMPARE) {
      throw new Error(`You can compare up to ${MAX_COMPARE} products`);
    }
    await db.compareItem
      .create({ userId, productId })
      .catch(() => undefined);
  },

  async remove(userId: string, productId: number): Promise<void> {
    await ensureConn();
    await db.compareItem.deleteMany({ userId, productId });
  },

  async clear(userId: string): Promise<void> {
    await ensureConn();
    await db.compareItem.deleteMany({ userId });
  },

  async replace(userId: string, productIds: number[]): Promise<void> {
    await ensureConn();
    const trimmed = productIds.slice(0, MAX_COMPARE);
    await db.compareItem.deleteMany({ userId });
    for (const productId of trimmed) {
      await db.compareItem.create({ userId, productId }).catch(() => undefined);
    }
  },
};
