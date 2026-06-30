/**
 * Auth service — signup/signin/refresh, backed by the User collection (Mongoose).
 * Token issuance + cookie management live in `@/lib/session`.
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/lib/jwt";
import mongoose from "mongoose";

export class AuthServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "conflict" | "invalid" | "not-found",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

interface UserLean {
  _id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
  passwordHash: string;
}

function toSessionUser(user: UserLean): SessionUser {
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
  };
}

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

export const authService = {
  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<SessionUser> {
    await ensureConn();
    const existing = await db.user.findOne({ email: input.email.toLowerCase() });
    if (existing) {
      throw new AuthServiceError("Email already registered", "conflict", 409);
    }
    const passwordHash = await hashPassword(input.password);
    const user = (await db.user.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: "CUSTOMER",
    })) as unknown as UserLean;
    return toSessionUser(user);
  },

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<SessionUser> {
    await ensureConn();
    const user = (await db.user
      .findOne({ email: input.email.toLowerCase() })
      .lean()) as UserLean | null;
    if (!user) {
      throw new AuthServiceError("Invalid email or password", "invalid", 401);
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthServiceError("Invalid email or password", "invalid", 401);
    }
    return toSessionUser(user);
  },
};
