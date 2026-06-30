/**
 * Orders service — real DB-backed orders (Mongoose + MongoDB). Handles
 * creation (from checkout), listing, status transitions, and admin/customer
 * views.
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import mongoose from "mongoose";

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

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

interface OrderLean {
  _id: string;
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
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface OrderItemLean {
  _id: string;
  orderId: string;
  productId: number;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string;
}

function serializeOrder(
  order: OrderLean,
  items: OrderItemLean[],
) {
  const createdAt =
    order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt);
  const updatedAt =
    order.updatedAt instanceof Date ? order.updatedAt : new Date(order.updatedAt);
  return {
    id: String(order._id),
    number: order.number,
    userId: order.userId,
    status: order.status as
      | "pending"
      | "processing"
      | "shipped"
      | "delivered"
      | "cancelled",
    subtotal: Number(Number(order.subtotal).toFixed(2)),
    discount: Number(Number(order.discount).toFixed(2)),
    shipping: Number(Number(order.shipping).toFixed(2)),
    tax: Number(Number(order.tax).toFixed(2)),
    total: Number(Number(order.total).toFixed(2)),
    shippingMethod: order.shippingMethod,
    paymentMethod: order.paymentMethod,
    couponCode: order.couponCode,
    shippingAddress: (order.shippingAddress as Record<string, unknown>) ?? {},
    billingAddress: (order.billingAddress as Record<string, unknown>) ?? {},
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    items: items.map((i) => ({
      id: String(i._id),
      productId: i.productId,
      title: i.title,
      price: Number(Number(i.price).toFixed(2)),
      quantity: i.quantity,
      thumbnail: i.thumbnail,
    })),
  };
}

export const ordersService = {
  async createOrder(input: CreateOrderInput) {
    await ensureConn();
    // Resolve live prices.
    const resolved = await Promise.all(
      input.items.map(async (line) => {
        const product = (await db.product.findById(line.id).lean()) as {
          _id: number;
          title: string;
          price: number;
          thumbnail: string;
          stock: number;
        } | null;
        if (!product) return null;
        return {
          productId: product._id,
          title: product.title,
          price: Number(Number(product.price).toFixed(2)),
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
      const coupon = (await db.coupon
        .findOne({ code: input.couponCode.toUpperCase() })
        .lean()) as {
        _id: string;
        active: boolean;
        expiresAt: Date | null;
        minSubtotal: number;
        type: string;
        value: number;
      } | null;
      if (!coupon || !coupon.active) {
        throw new OrdersServiceError("Invalid coupon", "invalid", 400);
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
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
      couponId = String(coupon._id);
    }

    const shippingCost =
      subtotal - discount >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_METHODS[input.shippingMethod].cost;
    const taxable = Math.max(0, subtotal - discount);
    const tax = Number((taxable * TAX_RATE).toFixed(2));
    const total = Number((taxable + shippingCost + tax).toFixed(2));

    // Assign sequential order number.
    const lastOrder = (await db.order.findOne().sort({ number: -1 }).lean()) as {
      number: number;
    } | null;
    const number = (lastOrder?.number ?? 1000) + 1;

    // Create order.
    const created = (await db.order.create({
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
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      customerEmail: input.customer.email,
      customerName: input.customer.fullName,
    })) as OrderLean;

    // Create order items.
    await db.orderItem.insertMany(
      orderItems.map((i) => ({
        orderId: String(created._id),
        productId: i.productId,
        title: i.title,
        price: i.price,
        quantity: i.quantity,
        thumbnail: i.thumbnail,
      })),
    );

    // Decrement stock.
    for (const item of orderItems) {
      await db.product.updateOne(
        { _id: item.productId },
        {
          $inc: { stock: -item.quantity },
          $set: {
            availabilityStatus:
              item.stockBefore - item.quantity <= 0
                ? "Out of Stock"
                : "In Stock",
          },
        },
      );
    }

    // Bump coupon usage.
    if (couponId) {
      await db.coupon.updateOne({ _id: couponId }, { $inc: { usedCount: 1 } });
    }

    return this.getById(String(created._id), input.userId);
  },

  async getById(id: string, userId?: string) {
    await ensureConn();
    const order = (await db.order.findById(id).lean()) as OrderLean | null;
    if (!order) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    if (userId && order.userId !== userId) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    const items = (await db.orderItem
      .find({ orderId: id })
      .lean()) as OrderItemLean[];
    return serializeOrder(order, items);
  },

  async listForUser(
    userId: string,
    params: { page?: number; limit?: number; status?: string } = {},
  ) {
    await ensureConn();
    const { page = 1, limit = 10, status } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { userId };
    if (status && status !== "all") filter.status = status;
    const [total, rows] = await Promise.all([
      db.order.countDocuments(filter),
      db.order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const orders = rows as OrderLean[];
    // Fetch items for all orders in one query (more efficient than N+1).
    const orderIds = orders.map((o) => String(o._id));
    const allItems = (await db.orderItem
      .find({ orderId: { $in: orderIds } })
      .lean()) as OrderItemLean[];
    const itemsByOrder = new Map<string, OrderItemLean[]>();
    for (const it of allItems) {
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }
    return {
      items: orders.map((o) =>
        serializeOrder(o, itemsByOrder.get(String(o._id)) ?? []),
      ),
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
    await ensureConn();
    const { page = 1, limit = 20, status, search } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [
        { customerEmail: re },
        { customerName: re },
      ];
    }
    const [total, rows] = await Promise.all([
      db.order.countDocuments(filter),
      db.order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const orders = rows as OrderLean[];
    const orderIds = orders.map((o) => String(o._id));
    const allItems = (await db.orderItem
      .find({ orderId: { $in: orderIds } })
      .lean()) as OrderItemLean[];
    const itemsByOrder = new Map<string, OrderItemLean[]>();
    for (const it of allItems) {
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }
    return {
      items: orders.map((o) =>
        serializeOrder(o, itemsByOrder.get(String(o._id)) ?? []),
      ),
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
    await ensureConn();
    const order = (await db.order.findById(id).lean()) as OrderLean | null;
    if (!order) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    // Restock on cancel if previously in a fulfilled-able state.
    if (status === "cancelled" && order.status !== "cancelled") {
      const items = (await db.orderItem
        .find({ orderId: id })
        .lean()) as OrderItemLean[];
      for (const i of items) {
        await db.product.updateOne(
          { _id: i.productId },
          { $inc: { stock: i.quantity } },
        );
      }
    }
    const updated = (await db.order
      .findByIdAndUpdate(id, { $set: { status } }, { new: true })
      .lean()) as OrderLean | null;
    if (!updated) {
      throw new OrdersServiceError("Order not found", "not-found", 404);
    }
    const items = (await db.orderItem
      .find({ orderId: id })
      .lean()) as OrderItemLean[];
    return serializeOrder(updated, items);
  },

  async getRecent(limit = 6) {
    await ensureConn();
    const rows = (await db.order
      .find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()) as OrderLean[];
    const orderIds = rows.map((o) => String(o._id));
    const allItems = (await db.orderItem
      .find({ orderId: { $in: orderIds } })
      .lean()) as OrderItemLean[];
    const itemsByOrder = new Map<string, OrderItemLean[]>();
    for (const it of allItems) {
      const arr = itemsByOrder.get(it.orderId) ?? [];
      arr.push(it);
      itemsByOrder.set(it.orderId, arr);
    }
    return rows.map((o) =>
      serializeOrder(o, itemsByOrder.get(String(o._id)) ?? []),
    );
  },
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export { SHIPPING_METHODS };
