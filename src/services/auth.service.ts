/**
 * Auth service — signup/signin/refresh, backed by the User table.
 * Token issuance + cookie management live in `@/lib/session`.
 */
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ProductServiceError as _ } from "@/services/products.service"; // ensure tree-shake safe
import type { SessionUser } from "@/lib/jwt";

void _;

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

function toSessionUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
  };
}

export const authService = {
  async signUp(input: {
    name: string;
    email: string;
    password: string;
  }): Promise<SessionUser> {
    const existing = await db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new AuthServiceError("Email already registered", "conflict", 409);
    }
    const passwordHash = await hashPassword(input.password);
    const user = await db.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: "CUSTOMER",
      },
      select: { id: true, email: true, name: true, role: true, avatar: true },
    });
    return toSessionUser(user);
  },

  async signIn(input: {
    email: string;
    password: string;
  }): Promise<SessionUser> {
    const user = await db.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user) {
      throw new AuthServiceError("Invalid email or password", "invalid", 401);
    }
    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new AuthServiceError("Invalid email or password", "invalid", 401);
    }
    return toSessionUser({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    });
  },
};
