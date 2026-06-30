/**
 * Users service — profile, password, avatar, account deletion (Mongoose).
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import { hashPassword, verifyPassword } from "@/lib/password";
import mongoose from "mongoose";

export class UsersServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "invalid" | "conflict",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "UsersServiceError";
  }
}

export interface PublicUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: string;
}

interface UserLean {
  _id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: Date | string;
}

function toPublic(user: UserLean): PublicUser {
  const createdAt =
    user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt);
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    createdAt: createdAt.toISOString(),
  };
}

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const usersService = {
  async getById(id: string): Promise<PublicUser> {
    await ensureConn();
    const user = (await db.user.findById(id).lean()) as UserLean | null;
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    return toPublic(user);
  },

  async updateProfile(
    id: string,
    input: { name?: string; phone?: string | null; avatar?: string | null },
  ): Promise<PublicUser> {
    await ensureConn();
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.avatar !== undefined) data.avatar = input.avatar;
    const user = (await db.user
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()) as UserLean | null;
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    return toPublic(user);
  },

  async changePassword(
    id: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    await ensureConn();
    const user = (await db.user.findById(id).lean()) as UserLean & {
      passwordHash: string;
    } | null;
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UsersServiceError("Current password is incorrect", "invalid", 401);
    }
    const passwordHash = await hashPassword(input.newPassword);
    await db.user.updateOne({ _id: id }, { $set: { passwordHash } });
  },

  async deleteAccount(id: string, password: string): Promise<void> {
    await ensureConn();
    const user = (await db.user.findById(id).lean()) as UserLean & {
      passwordHash: string;
    } | null;
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UsersServiceError("Password is incorrect", "invalid", 401);
    }
    // Cascade: delete user + related data (Mongoose doesn't cascade
    // automatically, so we delete in sequence).
    await db.address.deleteMany({ userId: id });
    await db.wishlistItem.deleteMany({ userId: id });
    await db.compareItem.deleteMany({ userId: id });
    await db.refreshToken.deleteMany({ userId: id });
    await db.user.deleteOne({ _id: id });
  },

  /** Admin: list all customers with aggregated order stats. */
  async listCustomers(
    params: { page?: number; limit?: number; search?: string } = {},
  ) {
    await ensureConn();
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { role: "CUSTOMER" };
    if (search) {
      const re = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ name: re }, { email: re }];
    }
    const [total, users] = await Promise.all([
      db.user.countDocuments(filter),
      db.user.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);
    const userDocs = users as UserLean[];
    const userIds = userDocs.map((u) => String(u._id));
    // Aggregate order totals per user in one query.
    const orderAgg = (await db.order.aggregate([
      { $match: { userId: { $in: userIds } } },
      {
        $group: {
          _id: "$userId",
          totalSpent: { $sum: { $cond: [{ $ne: ["$status", "cancelled"] }, "$total", 0] } },
          orderCount: { $sum: 1 },
        },
      },
    ])) as { _id: string; totalSpent: number; orderCount: number }[];
    const statsMap = new Map<string, { totalSpent: number; orderCount: number }>();
    for (const a of orderAgg) {
      statsMap.set(a._id, {
        totalSpent: Number(a.totalSpent.toFixed(2)),
        orderCount: a.orderCount,
      });
    }
    return {
      items: userDocs.map((u) => {
        const stats = statsMap.get(String(u._id)) ?? {
          totalSpent: 0,
          orderCount: 0,
        };
        return {
          ...toPublic(u),
          totalSpent: stats.totalSpent,
          orderCount: stats.orderCount,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },
};
