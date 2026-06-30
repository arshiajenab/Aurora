/**
 * Seed script — pulls the product catalog from DummyJSON (the free public
 * API data source) and persists it to the local MongoDB database. Run with:
 *
 *   npx tsx scripts/seed.ts
 *
 * Idempotent: re-running skips existing rows. After seeding, the entire
 * app reads/writes against the local DB.
 */
import { connectDB, ProductModel, CategoryModel, CouponModel } from "../src/lib/models";

// Ensure the URI is clean (strip quotes if the .env loader kept them).
const rawUri = process.env.DATABASE_URL ?? "";
process.env.DATABASE_URL = rawUri.replace(/^["']|["']$/g, "");

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
  return res.json() as Promise<T>;
}

async function seed() {
  await connectDB();

  // Fast path: if the DB already has products, skip the network fetches.
  const existing = await ProductModel.countDocuments();
  if (existing > 0) {
    console.log(`✓ Database already seeded (${existing} products). Skipping.`);
    return;
  }

  console.log("→ Seeding categories…");
  const cats = await fetchJson<DummyCategory[]>(`${DUMMY_BASE}/products/categories`);
  for (const cat of cats) {
    const found = await CategoryModel.findById(cat.slug);
    if (found) {
      await CategoryModel.updateOne({ _id: cat.slug }, { name: cat.name });
    } else {
      await CategoryModel.create({ _id: cat.slug, name: cat.name });
    }
  }
  console.log(`  ✓ ${cats.length} categories`);

  console.log("→ Seeding products (paginated)…");
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
      const data = {
        _id: p.id,
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
      };
      const found = await ProductModel.findById(p.id);
      if (found) {
        await ProductModel.updateOne({ _id: p.id }, { $set: data });
      } else {
        await ProductModel.create(data);
      }
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
    const found = await CouponModel.findOne({ code: c.code });
    if (!found) {
      await CouponModel.create({ ...c, active: true });
    }
  }
  console.log(`  ✓ ${coupons.length} coupons`);

  console.log("→ Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
