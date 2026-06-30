import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import {
  addressesService,
  AddressesServiceError,
} from "@/services/addresses.service";
import { addressSchema } from "@/lib/validations";

/** GET /api/addresses */
export async function GET() {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const addresses = await addressesService.list(session.user.id);
  return NextResponse.json({ addresses });
}

/** POST /api/addresses */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }
  try {
    const address = await addressesService.create(session.user.id, parsed.data);
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    if (err instanceof AddressesServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
