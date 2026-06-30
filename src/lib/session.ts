/**
 * Session resolution — reads the access-token cookie, verifies it, and
 * hydrates the SessionUser. Used by protected Route Handlers and Server
 * Components via `getSession()` / `requireSession()` (Mongoose).
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import {
  signAccessToken,
  verifyAccessToken,
  verifyRefreshTokenBinder,
  signRefreshTokenBinder,
  generateOpaqueToken,
  hashToken,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  type SessionUser,
} from "@/lib/jwt";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth-constants";
import mongoose from "mongoose";

export { ACCESS_COOKIE, REFRESH_COOKIE };

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

interface UserLean {
  _id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
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

/** Read + verify the access token from cookies. Does NOT refresh. */
export async function getSession(): Promise<SessionUser | null> {
  await ensureConn();
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const user = (await db.user.findById(payload.sub).lean()) as UserLean | null;
  return user ? toSessionUser(user) : null;
}

/**
 * Resolve the current session; if the access token expired, attempt a
 * silent refresh using the refresh-token cookie. Returns null if the user
 * is not authenticated.
 */
export async function getSessionOrRefresh(): Promise<SessionUser | null> {
  await ensureConn();
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) {
      const user = (await db.user.findById(payload.sub).lean()) as UserLean | null;
      if (user) return toSessionUser(user);
    }
  }

  // Try refresh.
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const binder = await verifyRefreshTokenBinder(refresh);
  if (!binder) return null;

  const tokenHash = await hashToken(refresh);
  const stored = (await db.refreshToken.findOne({ tokenHash }).lean()) as {
    _id: string;
    userId: string;
    revoked: boolean;
    expiresAt: Date;
  } | null;
  if (!stored || stored.revoked || new Date(stored.expiresAt) < new Date()) {
    return null;
  }

  const user = (await db.user.findById(stored.userId).lean()) as UserLean | null;
  if (!user) return null;

  // Rotate: revoke old, issue new.
  await db.refreshToken.updateOne(
    { _id: stored._id },
    { $set: { revoked: true } },
  );
  const newOpaque = generateOpaqueToken();
  const newHash = await hashToken(newOpaque);
  await db.refreshToken.create({
    userId: stored.userId,
    tokenHash: newHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
  });

  store.set(ACCESS_COOKIE, await signAccessToken(toSessionUser(user)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
  store.set(REFRESH_COOKIE, await signRefreshTokenBinder(newOpaque, String(user._id)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL,
  });

  return toSessionUser(user);
}

/** Throw-shaped helper for Route Handlers: returns the user or a 401 response. */
export async function requireSession(): Promise<
  { ok: true; user: SessionUser } | { ok: false; response: Response }
> {
  const user = await getSessionOrRefresh();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

/** Issue access + refresh cookies for a freshly authenticated user. */
export async function setSessionCookies(user: SessionUser): Promise<void> {
  await ensureConn();
  const store = await cookies();
  const access = await signAccessToken(user);
  const opaque = generateOpaqueToken();
  const tokenHash = await hashToken(opaque);
  await db.refreshToken.create({
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
  });
  const refreshBinder = await signRefreshTokenBinder(opaque, user.id);

  store.set(ACCESS_COOKIE, access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
  store.set(REFRESH_COOKIE, refreshBinder, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL,
  });
}

/** Clear session cookies + revoke the refresh token. */
export async function clearSessionCookies(): Promise<void> {
  await ensureConn();
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    const binder = await verifyRefreshTokenBinder(refresh);
    if (binder) {
      const tokenHash = await hashToken(refresh);
      await db.refreshToken
        .updateMany({ tokenHash, revoked: false }, { $set: { revoked: true } })
        .catch(() => undefined);
    }
  }
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
