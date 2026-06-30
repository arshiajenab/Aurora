/**
 * Users service — profile, password, avatar, account deletion.
 */
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";

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

function toPublic(user: {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

export const usersService = {
  async getById(id: string): Promise<PublicUser> {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    return toPublic(user);
  },

  async updateProfile(
    id: string,
    input: { name?: string; phone?: string | null; avatar?: string | null },
  ): Promise<PublicUser> {
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.phone !== undefined) data.phone = input.phone;
    if (input.avatar !== undefined) data.avatar = input.avatar;
    const user = await db.user.update({
      where: { id },
      data: data as never,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });
    return toPublic(user);
  },

  async changePassword(
    id: string,
    input: { currentPassword: string; newPassword: string },
  ): Promise<void> {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    const ok = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!ok) {
      throw new UsersServiceError("Current password is incorrect", "invalid", 401);
    }
    const passwordHash = await hashPassword(input.newPassword);
    await db.user.update({ where: { id }, data: { passwordHash } });
  },

  async deleteAccount(id: string, password: string): Promise<void> {
    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      throw new UsersServiceError("User not found", "not-found", 404);
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      throw new UsersServiceError("Password is incorrect", "invalid", 401);
    }
    // Cascade delete handles addresses, orders' user relation, wishlist, etc.
    // Orders themselves are kept (anonymised) for record-keeping: we null the
    // userId by reassigning to a sentinel — but our schema requires userId.
    // Simpler: delete the user and cascade orders too (acceptable for demo).
    await db.user.delete({ where: { id } });
  },

  /** Admin: list all customers with aggregated order stats. */
  async listCustomers(params: { page?: number; limit?: number; search?: string } = {}) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { role: "CUSTOMER" };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    const [total, users] = await Promise.all([
      db.user.count({ where: where as never }),
      db.user.findMany({
        where: where as never,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          avatar: true,
          role: true,
          createdAt: true,
          orders: { select: { total: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);
    return {
      items: users.map((u) => ({
        ...toPublic(u),
        totalSpent: Number(
          u.orders
            .filter((o) => o.status !== "cancelled")
            .reduce((s, o) => s + o.total, 0)
            .toFixed(2),
        ),
        orderCount: u.orders.length,
      })),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },
};
