/**
 * Mock admin & analytics service.
 *
 * In a real backend this would hit `/api/admin/*`. Here we derive stable,
 * deterministic mock data from the live product catalog so the dashboard
 * always renders something meaningful without a separate DB.
 */

import { productService } from "@/services/products.service";
import type { AdminKpi, Order, OrderStatus, RevenuePoint } from "@/types";

/* Deterministic PRNG so charts don't jump between renders. */
function seededRandom(seed: number): () => number {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const adminService = {
  async getRevenueSeries(): Promise<RevenuePoint[]> {
    const rng = seededRandom(42);
    return MONTHS.map((label, i) => {
      const seasonal = 1 + 0.18 * Math.sin((i / 12) * Math.PI * 2);
      const revenue = Math.round(
        (38_000 + rng() * 26_000) * seasonal + (i > 9 ? 18_000 : 0),
      );
      const orders = Math.round(revenue / (180 + rng() * 90));
      return { label, revenue, orders };
    });
  },

  async getKpis(): Promise<AdminKpi[]> {
    // Pull live totals so the dashboard never feels disconnected from reality.
    const all = await productService.getProducts({ page: 1, limit: 1 });
    const rng = seededRandom(7);
    const kpis: AdminKpi[] = [
      {
        label: "Total Revenue",
        value: "$842.3K",
        delta: 12.4,
        trend: "up",
      },
      {
        label: "Orders",
        value: "3,184",
        delta: 8.1,
        trend: "up",
      },
      {
        label: "Catalog Size",
        value: String(all.total),
        delta: 2.3,
        trend: "up",
      },
      {
        label: "Avg. Order Value",
        value: "$264",
        delta: -1.7,
        trend: "down",
      },
      {
        label: "Refund Rate",
        value: "1.9%",
        delta: -0.4,
        trend: "down",
      },
      {
        label: "Conversion",
        value: "3.7%",
        delta: 0.2,
        trend: "up",
      },
    ];
    void rng;
    return kpis;
  },

  async getRecentOrders(): Promise<Order[]> {
    const featured = await productService.getFeatured(8);
    const statuses: OrderStatus[] = [
      "delivered",
      "processing",
      "shipped",
      "pending",
      "delivered",
      "cancelled",
      "shipped",
      "delivered",
    ];
    const customers = [
      "Ava Thompson",
      "Liam Chen",
      "Sofia Reyes",
      "Noah Patel",
      "Mia Andersson",
      "Ethan Walker",
      "Isabella Romano",
      "Lucas Meyer",
    ];
    const cities = ["New York", "London", "Tokyo", "Berlin", "Paris", "Toronto"];

    return featured.map((product, i) => {
      const qty = (i % 3) + 1;
      const subtotal = Number((product.price * qty).toFixed(2));
      const shipping = 12;
      const tax = Number((subtotal * 0.08).toFixed(2));
      const total = Number((subtotal + shipping + tax).toFixed(2));
      const daysAgo = i * 9 + 2;
      const createdAt = new Date(
        Date.now() - daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString();
      const [first, ...rest] = customers[i % customers.length].split(" ");
      return {
        id: `AUR-${1000 + i}`,
        createdAt,
        status: statuses[i % statuses.length],
        items: [
          {
            productId: product.id,
            title: product.title,
            price: product.price,
            quantity: qty,
            thumbnail: product.thumbnail,
          },
        ],
        subtotal,
        shipping,
        tax,
        total,
        customer: {
          fullName: `${first} ${rest.join(" ")}`,
          email: `${first.toLowerCase()}@example.com`,
          address: `${100 + i} Market Street`,
          city: cities[i % cities.length],
          zip: `${10000 + i * 137}`.slice(0, 5),
          country: i % 2 === 0 ? "United States" : "United Kingdom",
        },
      };
    });
  },

  async getInventory(): Promise<{
    lowStock: number;
    outOfStock: number;
    inStock: number;
    total: number;
  }> {
    const page1 = await productService.getProducts({ page: 1, limit: 30 });
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;
    for (const p of page1.items) {
      if (p.stock === 0) outOfStock++;
      else if (p.stock < 20) lowStock++;
      else inStock++;
    }
    return {
      inStock,
      lowStock,
      outOfStock,
      total: page1.total,
    };
  },
};
