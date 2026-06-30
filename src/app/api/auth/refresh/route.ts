import { NextResponse } from "next/server";
import { getSessionOrRefresh, clearSessionCookies } from "@/lib/session";

/**
 * POST /api/auth/refresh
 * Rotates the refresh token and issues a new access token. The heavy lifting
 * (DB-backed rotation) lives in `getSessionOrRefresh`.
 */
export async function POST() {
  const user = await getSessionOrRefresh();
  if (!user) {
    await clearSessionCookies();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar,
  });
}
