"use client";

import * as React from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * ImageUploader — reusable image upload + URL input.
 *
 * - `mode="single"` → one image (used for product thumbnail).
 * - `mode="multi"`  → multiple images (used for product gallery).
 *
 * Uploads via POST /api/upload?kind=products (multipart "files") → {urls}.
 * The parent receives the final URL(s) via `onChange`.
 */
export function ImageUploader({
  value,
  onChange,
  mode = "single",
  label,
}: {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  mode?: "single" | "multi";
  label?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const urls = Array.isArray(value) ? value : value ? [value] : [];

  const upload = async (files: FileList) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", f);
      const res = await fetch("/api/upload?kind=products", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { urls: string[] };
      if (mode === "single") {
        onChange(data.urls[0] ?? "");
      } else {
        onChange([...urls, ...data.urls]);
      }
      toast.success(
        `${data.urls.length} image${data.urls.length === 1 ? "" : "s"} uploaded`,
      );
    } catch {
      toast.error("Could not upload image");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeAt = (index: number) => {
    if (mode === "single") {
      onChange("");
    } else {
      const next = urls.filter((_, i) => i !== index);
      onChange(next);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className="text-sm font-medium leading-none">{label}</span>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {urls.map((url, i) => (
          <div
            key={url + i}
            className="group relative h-20 w-20 overflow-hidden rounded-xl border border-border/60 bg-muted"
          >
            <Image
              src={url}
              alt={`Upload ${i + 1}`}
              fill
              sizes="80px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => removeAt(i)}
              aria-label="Remove image"
              className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-foreground opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* Upload button */}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "inline-flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border/60 text-muted-foreground transition-colors hover:border-border hover:text-foreground",
            uploading && "opacity-60",
          )}
          aria-label={mode === "single" ? "Upload image" : "Upload images"}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          <span className="text-[10px] uppercase tracking-wider">
            {uploading ? "Uploading" : "Upload"}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple={mode === "multi"}
          className="sr-only"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {/* Manual URL input for thumbnail */}
      {mode === "single" && (
        <input
          type="url"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground/40"
        />
      )}
    </div>
  );
}
