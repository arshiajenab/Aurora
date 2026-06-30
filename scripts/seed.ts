/**
 * Seed script — pulls the product catalog from DummyJSON (the free public
 * API data source) and persists it to the local database. Run with:
 *
 *   bun run scripts/seed.ts
 *
 * Idempotent: re-running upserts and skips existing categories/products.
 * This is the ONLY place DummyJSON is referenced for catalog data; after
 * seeding, the entire app reads/writes against the local DB.
 */
import { db } from "../src/lib/db";

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
  meta: { createdAt: string; updatedAt: string; barcode: string; qrCode: string };
  thumbnail: string;
  images: string[];
}

interface DummyCategory {
  slug: string;
  name: string;
  url: string;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json() as Promise<T>;
}

async function seed() {
  console.log("→ Seeding categories…");
  const cats = await fetchJson<DummyCategory[]>(`${DUMMY_BASE}/products/categories`);
  for (const cat of cats) {
    await db.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { slug: cat.slug, name: cat.name },
    });
  }
  console.log(`  ✓ ${cats.length} categories`);

  console.log("→ Seeding products (paginated)…");
  let total = 0;
  let skip = 0;
  const limit = 100;
  // DummyJSON reports ~194 products; loop until exhausted.
  while (true) {
    const batch = await fetchJson<{ products: DummyProduct[]; total: number }>(
      `${DUMMY_BASE}/products?limit=${limit}&skip=${skip}`,
    );
    if (batch.products.length === 0) break;

    for (const p of batch.products) {
      const price = Number(p.price.toFixed(2));
      await db.product.upsert({
        where: { id: p.id },
        update: {
          title: p.title,
          description: p.description,
          category: p.category,
          price,
          discountPercentage: p.discountPercentage ?? 0,
          rating: p.rating,
          stock: p.stock,
          tags: JSON.stringify(p.tags ?? []),
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
          images: JSON.stringify(p.images ?? [p.thumbnail]),
          featured: p.rating >= 4.6,
          status: p.stock > 0 ? "active" : "inactive",
        },
        create: {
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          price,
          discountPercentage: p.discountPercentage ?? 0,
          rating: p.rating,
          stock: p.stock,
          tags: JSON.stringify(p.tags ?? []),
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
          images: JSON.stringify(p.images ?? [p.thumbnail]),
          featured: p.rating >= 4.6,
          status: p.stock > 0 ? "active" : "inactive",
        },
      });
    }
    total += batch.products.length;
    skip += limit;
    if (skip >= batch.total) break;
  }
  console.log(`  ✓ ${total} products`);

  console.log("→ Seeding demo coupons…");
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
  console.log(`  ✓ ${coupons.length} coupons`);

  console.log("→ Done.");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
