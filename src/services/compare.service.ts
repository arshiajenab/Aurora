/**
 * Compare service — persisted per-user compare list (up to 4 items).
 * Mirrors the wishlist pattern: client store for instant UX, DB sync when
 * authenticated.
 */
import { db } from "@/lib/db";
import { productService } from "@/services/products.service";
import type { Product } from "@/types";

export const MAX_COMPARE = 4;

export const compareService = {
  async list(userId: string): Promise<Product[]> {
    const rows = await db.compareItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: "asc" },
    });
    return rows
      .map((r) => r.product)
      .filter(Boolean) as unknown as Product[];
  },

  async listIds(userId: string): Promise<number[]> {
    const rows = await db.compareItem.findMany({
      where: { userId },
      select: { productId: true },
      orderBy: { createdAt: "asc" },
    });
    return rows.map((r) => r.productId);
  },

  async add(userId: string, productId: number): Promise<void> {
    const product = await productService.getProduct(productId);
    if (!product) return;
    const count = await db.compareItem.count({ where: { userId } });
    if (count >= MAX_COMPARE) {
      throw new Error(`You can compare up to ${MAX_COMPARE} products`);
    }
    await db.compareItem
      .create({ data: { userId, productId } })
      .catch(() => undefined);
  },

  async remove(userId: string, productId: number): Promise<void> {
    await db.compareItem.deleteMany({ where: { userId, productId } });
  },

  async clear(userId: string): Promise<void> {
    await db.compareItem.deleteMany({ where: { userId } });
  },

  async replace(userId: string, productIds: number[]): Promise<void> {
    // Sequential ops (avoids $transaction — needs replica set on standalone MongoDB).
    const trimmed = productIds.slice(0, MAX_COMPARE);
    await db.compareItem.deleteMany({ where: { userId } });
    for (const productId of trimmed) {
      await db.compareItem.create({ data: { userId, productId } });
    }
  },
};
