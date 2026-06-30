/**
 * Session resolution — reads the access-token cookie, verifies it, and
 * hydrates the SessionUser. Used by protected Route Handlers and Server
 * Components via `getSession()` / `requireSession()`.
 */
import { cookies } from "next/headers";
import { db } from "@/lib/db";
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

export { ACCESS_COOKIE, REFRESH_COOKIE };

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

/** Read + verify the access token from cookies. Does NOT refresh. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ACCESS_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, name: true, role: true, avatar: true },
  });
  return user ? toSessionUser(user) : null;
}

/**
 * Resolve the current session; if the access token expired, attempt a
 * silent refresh using the refresh-token cookie. Returns null if the user
 * is not authenticated.
 */
export async function getSessionOrRefresh(): Promise<SessionUser | null> {
  const store = await cookies();
  const access = store.get(ACCESS_COOKIE)?.value;
  if (access) {
    const payload = await verifyAccessToken(access);
    if (payload) {
      const user = await db.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, role: true, avatar: true },
      });
      if (user) return toSessionUser(user);
    }
  }

  // Try refresh.
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (!refresh) return null;

  const binder = await verifyRefreshTokenBinder(refresh);
  if (!binder) return null;

  const tokenHash = await hashToken(refresh);
  const stored = await db.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true, avatar: true },
      },
    },
  });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    return null;
  }

  // Rotate: revoke old, issue new.
  await db.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });
  const newOpaque = generateOpaqueToken();
  const newHash = await hashToken(newOpaque);
  await db.refreshToken.create({
    data: {
      userId: stored.userId,
      tokenHash: newHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    },
  });
  const newBinder = await signRefreshTokenBinder(stored.id, stored.userId);

  store.set(ACCESS_COOKIE, await signAccessToken(toSessionUser(stored.user)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL,
  });
  store.set(REFRESH_COOKIE, newBinder, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL,
  });

  return toSessionUser(stored.user);
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
  const store = await cookies();
  const access = await signAccessToken(user);
  const opaque = generateOpaqueToken();
  const tokenHash = await hashToken(opaque);
  await db.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL * 1000),
    },
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
  const store = await cookies();
  const refresh = store.get(REFRESH_COOKIE)?.value;
  if (refresh) {
    const binder = await verifyRefreshTokenBinder(refresh);
    if (binder) {
      const tokenHash = await hashToken(refresh);
      await db.refreshToken
        .updateMany({
          where: { tokenHash, revoked: false },
          data: { revoked: true },
        })
        .catch(() => undefined);
    }
  }
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
