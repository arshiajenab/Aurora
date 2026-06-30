/**
 * Orders service — real DB-backed orders. Handles creation (from checkout),
 * listing, status transitions, and admin/customer views.
 */
import { db } from "@/lib/db";
import { productService } from "@/services/products.service";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";

export class OrdersServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "invalid" | "conflict",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "OrdersServiceError";
  }
}

export interface CreateOrderInput {
  userId: string;
  items: { id: number; quantity: number }[];
  customer: {
    fullName: string;
    email: string;
    address: string;
    city: string;
    zip: string;
    country: string;
  };
  shippingAddress: Record<string, unknown>;
  billingAddress: Record<string, unknown>;
  shippingMethod: "standard" | "express";
  paymentMethod: "card" | "cod" | "paypal";
  couponCode?: string | null;
}

const SHIPPING_METHODS = {
  standard: { label: "Standard", cost: SHIPPING_FLAT_RATE, eta: "3-5 days" },
  express: { label: "Express", cost: SHIPPING_FLAT_RATE * 2, eta: "1-2 days" },
};

export const ordersService = {
  async createOrder(input: CreateOrderInput) {
    // Resolve live prices + decrement stock atomically (MongoDB).
    const resolved = await Promise.all(
      input.items.map(async (line) => {
        const product = await db.product.findUnique({ where: { id: line.id } });
        if (!product) return null;
        return {
          productId: product.id,
          title: product.title,
          price: Number(product.price.toFixed(2)),
          quantity: line.quantity,
          thumbnail: product.thumbnail,
          stockBefore: product.stock,
        };
      }),
    );
    const orderItems = resolved.filter(
      (r): r is NonNullable<typeof r> => r !== null,
    );
    if (orderItems.length !== input.items.length) {
      throw new OrdersServiceError(
        "One or more products are no longer available",
        "not-found",
        404,
      );
    }
    // Stock guard.
    for (const item of orderItems) {
      if (item.stockBefore < item.quantity) {
        throw new OrdersServiceError(
          `Insufficient stock for ${item.title}`,
          "conflict",
          409,
        );
      }
    }

    const subtotal = Number(
      orderItems.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2),
    );

    // Coupon validation.
    let discount = 0;
    let couponId: string | null = null;
    if (input.couponCode) {
      const coupon = await db.coupon.findUnique({
        where: { code: input.couponCode.toUpperCase() },
      });
      if (!coupon || !coupon.active) {
        throw new OrdersServiceError("Invalid coupon", "invalid", 400);
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        throw new OrdersServiceError("Coupon expired", "invalid", 400);
      }
      if (subtotal < coupon.minSubtotal) {
        throw new OrdersServiceError(
          `Coupon requires a minimum subtotal of $${coupon.minSubtotal}`,
          "invalid",
          400,
        );
      }
      discount =
        coupon.type === "percent"
          ? Number(((subtotal * coupon.value) / 100).toFixed(2))
          : Math.min(Number(coupon.value.toFixed(2)), subtotal);
      couponId = coupon.id;
    }

    const shippingCost =
      subtotal - discount >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_METHODS[input.shippingMethod].cost;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number((taxable * TAX_RATE).toFixed(2));
    const total = Number((taxable + shippingCost + tax).toFixed(2));

    // Assign sequential order number.
    const lastNumber = await db.order.aggregate({
      _max: { number: true },
    });
    const number = (lastNumber._max.number ?? 1000) + 1;

    // Create order + items + decrement stock sequentially (avoids
    // $transaction, which requires a replica set on standalone MongoDB).
    const created = await db.order.create({
      data: {
        number,
        userId: input.userId,
        status: "pending",
        subtotal,
        discount,
        shipping: shippingCost,
        tax,
        total,
        shippingMethod: input.shippingMethod,
        paymentMethod: input.paymentMethod,
        couponCode: input.couponCode?.toUpperCase() ?? null,
        shippingAddress: input.shippingAddress as never,
        billingAddress: input.billingAddress as never,
        customerEmail: input.customer.email,
        customerName: input.customer.fullName,
      },
    });
    await db.orderItem.createMany({
      data: orderItems.map((i) => ({
        orderId: created.id,
        productId: i.productId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        thumbnail: i.thumbnail,
      })),
    });
    for (const item of orderItems) {
      await db.product.update({
        where: { id: item.productId },
        data: {
          stock: { decrement: item.quantity },
          availabilityStatus:
            item.stockBefore - item.quantity <= 0
              ? "Out of Stock"
              : "In Stock",
        },
      });
    }
    if (couponId) {
      await db.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    return this.getById(created.id, input.userId);
  },

  async getById(id: string, userId?: string) {
    const order = await db.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    if (userId && order.userId !== userId) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    return serializeOrder(order);
  },

  async listForUser(
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ) {
    const { page = 1, limit = 10, status } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { userId };
    if (status && status !== "all") where.status = status;
    const [total, rows] = await Promise.all([
      db.order.count({ where: where as never }),
      db.order.findMany({
        where: where as never,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return {
      items: rows.map(serializeOrder),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async listForAdmin(params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, status, search } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};
    if (status && status !== "all") where.status = status;
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { customerEmail: { contains: search } },
        { customerName: { contains: search } },
      ];
    }
    const [total, rows] = await Promise.all([
      db.order.count({ where: where as never }),
      db.order.findMany({
        where: where as never,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return {
      items: rows.map(serializeOrder),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async updateStatus(
    id: string,
    status: "pending" | "processing" | "shipped" | "delivered" | "cancelled",
  ) {
    const order = await db.order.findUnique({ where: { id } });
    if (!order) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    // Restock on cancel if previously in a fulfilled-able state.
    // Sequential updates (avoids $transaction — needs replica set).
    if (status === "cancelled" && order.status !== "cancelled") {
      const items = await db.orderItem.findMany({ where: { orderId: id } });
      for (const i of items) {
        await db.product.update({
          where: { id: i.productId },
          data: { stock: { increment: i.quantity } },
        });
      }
    }
    const updated = await db.order.update({
      where: { id },
      data: { status },
      include: { items: true },
    });
    return serializeOrder(updated);
  },

  async getRecent(limit = 6) {
    const rows = await db.order.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(serializeOrder);
  },
};

function serializeOrder(order: {
  id: string;
  number: number;
  userId: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  shippingMethod: string;
  paymentMethod: string;
  couponCode: string | null;
  shippingAddress: unknown;
  billingAddress: unknown;
  customerEmail: string;
  customerName: string;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    productId: number;
    title: string;
    price: number;
    quantity: number;
    thumbnail: string;
  }[];
}) {
  return {
    id: order.id,
    number: order.number,
    userId: order.userId,
    status: order.status as
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled",
    subtotal: Number(order.subtotal.toFixed(2)),
    discount: Number(order.discount.toFixed(2)),
    shipping: Number(order.shipping.toFixed(2)),
    tax: Number(order.tax.toFixed(2)),
    total: Number(order.total.toFixed(2)),
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode,
    shippingAddress: (order.shippingAddress as Record<string, unknown>) ?? {},
    billingAddress: (order.billingAddress as Record<string, unknown>) ?? {},
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      ...i,
      price: Number(i.price.toFixed(2)),
    })),
  };
}

export { SHIPPING_METHODS };
