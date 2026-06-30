/**
 * Wishlist service — persisted per-user wishlist. The client Zustand store
 * remains the source of truth for instant UI; this service syncs when the
 * user is authenticated.
 */
import { db } from "@/lib/db";
import { productService } from "@/services/products.service";
import type { Product } from "@/types";

export const wishlistService = {
  async list(userId: string): Promise<Product[]> {
    const rows = await db.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => r.product).filter(Boolean) as unknown as Product[];
  },

  async listIds(userId: string): Promise<number[]> {
    const rows = await db.wishlistItem.findMany({
      where: { userId },
      select: { productId: true },
    });
    return rows.map((r) => r.productId);
  },

  async add(userId: string, productId: number): Promise<void> {
    const product = await productService.getProduct(productId);
    if (!product) return;
    await db.wishlistItem
      .create({ data: { userId, productId } })
      .catch(() => undefined); // unique constraint → already present
  },

  async remove(userId: string, productId: number): Promise<void> {
    await db.wishlistItem.deleteMany({
      where: { userId, productId },
    });
  },

  async clear(userId: string): Promise<void> {
    await db.wishlistItem.deleteMany({ where: { userId } });
  },

  /** Replace the stored wishlist with the given ids (used on login sync). */
  async replace(userId: string, productIds: number[]): Promise<void> {
    await db.$transaction([
      db.wishlistItem.deleteMany({ where: { userId } }),
      ...productIds.map((productId) =>
        db.wishlistItem.create({ data: { userId, productId } }),
      ),
    ]);
  },
};
