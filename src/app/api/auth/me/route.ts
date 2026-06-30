import { NextResponse } from "next/server";
import { getSessionOrRefresh } from "@/lib/session";
import { usersService } from "@/services/users.service";

/** GET /api/auth/me — current user profile (auto-login persistence). */
export async function GET() {
  const session = await getSessionOrRefresh();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  const user = await usersService.getById(session.id);
  return NextResponse.json({ user });
}
