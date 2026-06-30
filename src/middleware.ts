/**
 * Middleware — lightweight route protection.
 *
 * Strategy:
 *  - `/checkout` and `/account/*` require an access token. If absent/expired
 *    we DON'T attempt a DB-backed refresh here (middleware runs on the edge
 *    and should stay fast + stateless). Instead we redirect to /signin with
 *    a callback URL; the refresh flow runs in the Route Handler layer.
 *  - `/admin/*` is intentionally open (per product spec).
 *  - Everything else is public.
 */
import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import { ACCESS_COOKIE } from "@/lib/auth-constants";

const PROTECTED_PREFIXES = ["/checkout", "/account"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  if (payload) return NextResponse.next();

  // Redirect to sign-in, preserving the intended destination.
  const signInUrl = new URL("/signin", request.url);
  signInUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/checkout/:path*", "/account/:path*"],
};
