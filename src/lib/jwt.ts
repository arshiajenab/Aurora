/**
 * JWT helpers built on `jose` (Edge-compatible, so the same code runs in
 * middleware and in Route Handlers).
 *
 * Token strategy:
 *  - Access token: 15 min, carries { sub, email, name, role }.
 *  - Refresh token: opaque random string, stored hashed in DB, 30 day TTL.
 *    We don't JWT-sign the refresh token — rotating opaque tokens is the
 *    recommended pattern and lets us revoke individual sessions.
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_SECRET = new TextEncoder().encode(
  process.env.JWT_ACCESS_SECRET ?? "aurora-access-secret-change-me",
);
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "aurora-refresh-secret-change-me",
);

export const ACCESS_TOKEN_TTL = 15 * 60; // seconds
export const REFRESH_TOKEN_TTL = 60 * 60 * 24 * 30; // 30 days, seconds

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar: string | null;
}

export interface AccessTokenPayload extends JWTPayload {
  sub: string;
  email: string;
  name: string | null;
  role: string;
}

export async function signAccessToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL}s`)
    .sign(ACCESS_SECRET);
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, ACCESS_SECRET, {
      algorithms: ["HS256"],
    });
    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

/** Sign a short-lived JWT that carries the refresh-token id. Used by /refresh. */
export async function signRefreshTokenBinder(
  tokenId: string,
  userId: string,
): Promise<string> {
  return new SignJWT({ jti: tokenId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL}s`)
    .sign(REFRESH_SECRET);
}

export async function verifyRefreshTokenBinder(
  token: string,
): Promise<{ tokenId: string; userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET, {
      algorithms: ["HS256"],
    });
    if (!payload.jti || !payload.sub) return null;
    return { tokenId: payload.jti, userId: payload.sub };
  } catch {
    return null;
  }
}

export function generateOpaqueToken(): string {
  // 32 bytes of entropy, hex-encoded.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashToken(token: string): Promise<string> {
  // SHA-256 — refresh tokens are already high-entropy, so a fast hash is fine.
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
