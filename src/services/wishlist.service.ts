/**
 * Wishlist service — persisted per-user wishlist (Mongoose). The client
 * Zustand store remains the source of truth for instant UI; this service
 * syncs when the user is authenticated.
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import { productService } from "@/services/products.service";
import type { Product } from "@/types";
import mongoose from "mongoose";

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

export const wishlistService = {
  async list(userId: string): Promise<Product[]> {
    await ensureConn();
    const rows = (await db.wishlistItem
      .find({ userId })
      .sort({ createdAt: -1 })
      .lean()) as { productId: number }[];
    const products = await Promise.all(
      rows.map((r) => productService.getProduct(r.productId).catch(() => null)),
    );
    return products.filter((p): p is Product => p !== null);
  },

  async listIds(userId: string): Promise<number[]> {
    await ensureConn();
    const rows = (await db.wishlistItem
      .find({ userId })
      .lean()) as { productId: number }[];
    return rows.map((r) => r.productId);
  },

  async add(userId: string, productId: number): Promise<void> {
    await ensureConn();
    const product = await productService.getProduct(productId).catch(() => null);
    if (!product) return;
    await db.wishlistItem
      .create({ userId, productId })
      .catch(() => undefined); // duplicate key → already present
  },

  async remove(userId: string, productId: number): Promise<void> {
    await ensureConn();
    await db.wishlistItem.deleteMany({ userId, productId });
  },

  async clear(userId: string): Promise<void> {
    await ensureConn();
    await db.wishlistItem.deleteMany({ userId });
  },

  async replace(userId: string, productIds: number[]): Promise<void> {
    await ensureConn();
    await db.wishlistItem.deleteMany({ userId });
    for (const productId of productIds) {
      await db.wishlistItem.create({ userId, productId }).catch(() => undefined);
    }
  },
};
