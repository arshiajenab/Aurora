/**
 * Auto-seed — self-healing database bootstrap.
 *
 * Why this exists: a fresh `git clone` has an empty database. Rather than
 * forcing every developer to remember running `bun run scripts/seed.ts`,
 * this module runs once on the first server boot and seeds the catalog from
 * DummyJSON (the free public API) if — and only if — the Product table is
 * empty. On subsequent boots it's a no-op (a single COUNT query).
 *
 * It's imported from `src/lib/db.ts` so the check happens exactly once per
 * process, before any route handler reads from the DB.
 */
import { db } from "./db";

const DUMMY_BASE = "https://dummyjson.com";

interface DummyProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand?: string;
  sku: string;
  weight: number;
  dimensions: { width: number; height: number; depth: number };
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  returnPolicy: string;
  minimumOrderQuantity: number;
  thumbnail: string;
  images: string[];
}

interface DummyCategory {
  slug: string;
  name: string;
}

interface DummyProductsResponse {
  products: DummyProduct[];
  total: number;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return (await res.json()) as T;
}

let seedingPromise: Promise<void> | null = null;

/**
 * Ensures the database has products. Safe to call from anywhere — the
 * actual seeding runs at most once per process (guarded by `seedingPromise`).
 * Returns immediately if products already exist.
 */
export async function ensureSeeded(): Promise<void> {
  // If a seed is already in flight, wait for it rather than kicking off a
  // second parallel run.
  if (seedingPromise) return seedingPromise;
  seedingPromise = doSeed();
  return seedingPromise;
}

async function doSeed(): Promise<void> {
  try {
    const count = await db.product.count();
    if (count > 0) return; // already seeded — nothing to do

    console.log(
      "🌱 Database is empty — auto-seeding catalog from DummyJSON…",
    );

    // 1. Categories
    const cats = await fetchJson<DummyCategory[]>(
      `${DUMMY_BASE}/products/categories`,
    );
    for (const cat of cats) {
      await db.category.upsert({
        where: { slug: cat.slug },
        update: { name: cat.name },
        create: { slug: cat.slug, name: cat.name },
      });
    }

    // 2. Products (paginated)
    let total = 0;
    let skip = 0;
    const limit = 100;
    while (true) {
      const batch = await fetchJson<DummyProductsResponse>(
        `${DUMMY_BASE}/products?limit=${limit}&skip=${skip}`,
      );
      if (batch.products.length === 0) break;

      for (const p of batch.products) {
        const price = Number(p.price.toFixed(2));
        await db.product.upsert({
          where: { id: p.id },
          update: {},
          create: {
            id: p.id,
            title: p.title,
            description: p.description,
            category: p.category,
            price,
            discountPercentage: p.discountPercentage ?? 0,
            rating: p.rating,
            stock: p.stock,
            tags: p.tags ?? [],
            brand: p.brand ?? null,
            sku: p.sku,
            weight: p.weight,
            width: p.dimensions?.width ?? 0,
            height: p.dimensions?.height ?? 0,
            depth: p.dimensions?.depth ?? 0,
            warrantyInformation: p.warrantyInformation,
            shippingInformation: p.shippingInformation,
            availabilityStatus: p.availabilityStatus,
            returnPolicy: p.returnPolicy,
            minimumOrderQuantity: p.minimumOrderQuantity,
            thumbnail: p.thumbnail,
            images: p.images ?? [p.thumbnail],
            featured: p.rating >= 4.6,
            status: p.stock > 0 ? "active" : "inactive",
          },
        });
      }
      total += batch.products.length;
      skip += limit;
      if (skip >= batch.total) break;
    }

    // 3. Demo coupons
    const coupons = [
      { code: "WELCOME10", type: "percent", value: 10, minSubtotal: 0 },
      { code: "AURORA20", type: "percent", value: 20, minSubtotal: 200 },
      { code: "FREESHIP", type: "fixed", value: 12, minSubtotal: 0 },
    ];
    for (const c of coupons) {
      await db.coupon.upsert({
        where: { code: c.code },
        update: {},
        create: { ...c, active: true },
      });
    }

    console.log(`✓ Auto-seeded ${total} products, ${cats.length} categories, ${coupons.length} coupons.`);
  } catch (err) {
    // Don't crash the app if seeding fails (e.g. no network) — routes will
    // show empty states gracefully and the developer can run the seed
    // script manually once online.
    console.error("⚠ Auto-seed failed (the app will run with an empty catalog):", err instanceof Error ? err.message : err);
  }
}
