import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session";
import { addressesService, AddressesServiceError } from "@/services/addresses.service";

/** POST /api/addresses/[id]/default — set default address. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireSession();
  if (!session.ok) return session.response;
  const { id } = await params;
  try {
    const address = await addressesService.setDefault(session.user.id, id);
    return NextResponse.json({ address });
  } catch (err) {
    if (err instanceof AddressesServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
