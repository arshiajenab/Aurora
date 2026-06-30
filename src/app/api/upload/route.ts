import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

/**
 * POST /api/upload
 * Accepts multipart/form-data with one or more `files` fields. Persists to
 * `public/uploads/<kind>/` and returns the public URLs. Real, not mock.
 *
 * `kind` query param selects the subfolder: "products" | "avatars".
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") === "avatars" ? "avatars" : "products";
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  const maxSize = 5 * 1024 * 1024; // 5 MB

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", kind);
  await mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 422 },
      );
    }
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large (max 5MB): ${file.name}` },
        { status: 422 },
      );
    }
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const id = randomUUID();
    const filename = `${id}.${ext}`;
    const filepath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);
    urls.push(`/uploads/${kind}/${filename}`);
  }

  return NextResponse.json({ urls }, { status: 201 });
}
