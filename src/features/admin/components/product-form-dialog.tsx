"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/features/admin/components/image-uploader";
import { createProductSchema } from "@/lib/validations";
import type { Product, ProductCategory } from "@/types";

type FormValues = z.input<typeof createProductSchema>;

/**
 * ProductFormDialog — create or edit a product.
 *
 * Single dialog for both modes (driven by `product` prop). Submits to
 * POST /api/products (create) or PUT /api/products/[id] (edit). On success:
 * toast, close, and `router.refresh()` so the server table re-renders.
 *
 * Image upload is delegated to `ImageUploader` (single for thumbnail, multi
 * for the gallery). Tags are a comma-separated input → string[].
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: ProductCategory[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [tagsInput, setTagsInput] = React.useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      price: 0,
      discountPercentage: 0,
      stock: 0,
      tags: [],
      brand: "",
      sku: "",
      thumbnail: "",
      images: [],
      featured: false,
      status: "active",
      warrantyInformation: "",
      shippingInformation: "",
      returnPolicy: "30 days return policy",
      minimumOrderQuantity: 1,
      weight: 0,
      width: 0,
      height: 0,
      depth: 0,
    },
  });

  // Reset when the dialog opens or the product changes.
  React.useEffect(() => {
    if (!open) return;
    if (product) {
      form.reset({
        title: product.title,
        description: product.description,
        category: product.category,
        price: product.price,
        discountPercentage: product.discountPercentage,
        stock: product.stock,
        tags: product.tags,
        brand: product.brand ?? "",
        sku: product.sku,
        thumbnail: product.thumbnail,
        images: product.images,
        featured: product.featured ?? false,
        status: (product as unknown as { status?: string }).status === "inactive" ? "inactive" : "active",
        warrantyInformation: product.warrantyInformation,
        shippingInformation: product.shippingInformation,
        returnPolicy: product.returnPolicy,
        minimumOrderQuantity: product.minimumOrderQuantity,
        weight: product.weight,
        width: product.dimensions.width,
        height: product.dimensions.height,
        depth: product.dimensions.depth,
      });
      setTagsInput(product.tags.join(", "));
    } else {
      form.reset({
        title: "",
        description: "",
        category: categories[0]?.slug ?? "",
        price: 0,
        discountPercentage: 0,
        stock: 0,
        tags: [],
        brand: "",
        sku: "",
        thumbnail: "",
        images: [],
        featured: false,
        status: "active",
        warrantyInformation: "",
        shippingInformation: "",
        returnPolicy: "30 days return policy",
        minimumOrderQuantity: 1,
        weight: 0,
        width: 0,
        height: 0,
        depth: 0,
      });
      setTagsInput("");
    }
  }, [open, product, form, categories]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      // Parse tags from comma input.
      const tags =
        tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) ?? [];
      const payload = { ...values, tags };

      const res = product
        ? await fetch(`/api/products/${product.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save product");
      }
      toast.success(product ? "Product updated" : "Product created");
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "Create product"}</DialogTitle>
          <DialogDescription>
            {product
              ? "Update the details for this product."
              : "Add a new product to the catalog."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* --- Basics --- */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title")} placeholder="Essence Mascara" />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={3}
                {...register("description")}
                placeholder="A short, considered product description."
              />
              {errors.description && (
                <p className="text-xs text-destructive">
                  {errors.description.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v, { shouldValidate: true })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand">Brand</Label>
                <Input id="brand" {...register("brand")} placeholder="Aurora" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="beauty, mascara, waterproof (comma-separated)"
              />
              <p className="text-xs text-muted-foreground">
                Separate tags with commas.
              </p>
            </div>
          </div>

          <Separator />

          {/* --- Pricing & inventory --- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register("price")}
              />
              {errors.price && (
                <p className="text-xs text-destructive">{errors.price.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="discountPercentage">Discount (%)</Label>
              <Input
                id="discountPercentage"
                type="number"
                step="0.1"
                {...register("discountPercentage")}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Stock</Label>
              <Input id="stock" type="number" {...register("stock")} />
              {errors.stock && (
                <p className="text-xs text-destructive">{errors.stock.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register("sku")} placeholder="AUR-001" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="minimumOrderQuantity">Min order qty</Label>
              <Input
                id="minimumOrderQuantity"
                type="number"
                {...register("minimumOrderQuantity")}
              />
            </div>
          </div>

          <Separator />

          {/* --- Images --- */}
          <div className="flex flex-col gap-4">
            <ImageUploader
              label="Thumbnail"
              mode="single"
              value={watch("thumbnail")}
              onChange={(v) => setValue("thumbnail", (v as string) || "", { shouldValidate: true })}
            />
            <ImageUploader
              label="Gallery images"
              mode="multi"
              value={watch("images") ?? []}
              onChange={(v) => setValue("images", v as string[], { shouldValidate: true })}
            />
            {errors.thumbnail && (
              <p className="text-xs text-destructive">
                {errors.thumbnail.message}
              </p>
            )}
          </div>

          <Separator />

          {/* --- Specs --- */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="weight">Weight</Label>
              <Input id="weight" type="number" step="0.01" {...register("weight")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="width">Width</Label>
              <Input id="width" type="number" step="0.01" {...register("width")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="height">Height</Label>
              <Input id="height" type="number" step="0.01" {...register("height")} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="depth">Depth</Label>
              <Input id="depth" type="number" step="0.01" {...register("depth")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="warrantyInformation">Warranty</Label>
              <Input
                id="warrantyInformation"
                {...register("warrantyInformation")}
                placeholder="1 year"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shippingInformation">Shipping</Label>
              <Input
                id="shippingInformation"
                {...register("shippingInformation")}
                placeholder="Ships in 2-3 days"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="returnPolicy">Return policy</Label>
              <Input
                id="returnPolicy"
                {...register("returnPolicy")}
                placeholder="30 days return policy"
              />
            </div>
          </div>

          <Separator />

          {/* --- Status & featured --- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch("status")}
                onValueChange={(v) =>
                  setValue("status", v as "active" | "inactive", {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <Switch
                checked={watch("featured")}
                onCheckedChange={(v) => setValue("featured", v)}
              />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Featured</span>
                <span className="text-xs text-muted-foreground">
                  Show on the homepage
                </span>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {product ? "Save changes" : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
