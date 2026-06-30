import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/session";

/** POST /api/auth/logout */
export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
