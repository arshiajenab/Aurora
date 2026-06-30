"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StockIndicator } from "@/features/admin/components/stock-indicator";
import { ProductFormDialog } from "@/features/admin/components/product-form-dialog";
import { AdminPagination } from "@/features/admin/components/admin-pagination";
import { formatCurrency, titleCaseSlug } from "@/lib/format";
import { SORT_OPTIONS } from "@/lib/constants";
import type { Product, ProductCategory, SortOption } from "@/types";

/**
 * ProductsAdminTable — the client island for the admin products page.
 *
 * Owns all CRUD UI state: the "Create" button, row-level Edit/Delete, the
 * create/edit dialog, and the delete confirmation. Submits to /api/products
 * and calls `router.refresh()` so the server page re-fetches.
 *
 * Also owns the toolbar (search `?q=`, category `?category=`, status
 * `?status=`, sort `?sortBy=`) — URL-driven so the server page reads them
 * from searchParams.
 */
export function ProductsAdminTable({
  products,
  total,
  page,
  totalPages,
  categories,
  currentCategory,
  currentStatus,
  currentSort,
  currentQuery,
}: {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
  categories: ProductCategory[];
  currentCategory: string;
  currentStatus: string;
  currentSort: SortOption;
  currentQuery: string;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [deleteId, setDeleteId] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [search, setSearch] = React.useState(currentQuery);

  React.useEffect(() => {
    setSearch(currentQuery);
  }, [currentQuery]);

  const updateParams = React.useCallback(
    (updates: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params?.toString() ?? "");
      for (const [k, v] of Object.entries(updates)) {
        if (v && v !== "all") next.set(k, v);
        else next.delete(k);
      }
      const qs = next.toString();
      router.replace(qs ? `/admin/products?${qs}` : "/admin/products");
    },
    [router, params],
  );

  // Debounced search → URL.
  React.useEffect(() => {
    const handle = setTimeout(() => {
      if (search.trim() !== currentQuery) {
        const next = new URLSearchParams(params?.toString() ?? "");
        if (search.trim()) next.set("q", search.trim());
        else next.delete("q");
        next.delete("page");
        const qs = next.toString();
        router.replace(qs ? `/admin/products?${qs}` : "/admin/products");
      }
    }, 240);
    return () => clearTimeout(handle);
  }, [search, currentQuery, router, params]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to delete product");
      }
      toast.success("Product deleted");
      setDeleteId(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete product");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products…"
              className="h-9 rounded-full pl-9 pr-9"
              aria-label="Search products"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            value={currentCategory || "all"}
            onValueChange={(v) => updateParams({ category: v, page: undefined })}
          >
            <SelectTrigger className="h-9 w-40 rounded-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={currentStatus || "all"}
            onValueChange={(v) => updateParams({ status: v, page: undefined })}
          >
            <SelectTrigger className="h-9 w-32 rounded-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={currentSort}
            onValueChange={(v) => updateParams({ sortBy: v, page: undefined })}
          >
            <SelectTrigger className="h-9 w-40 rounded-full">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} className="gap-1.5 rounded-full">
          <Plus className="h-4 w-4" />
          Create product
        </Button>
      </div>

      {/* Table */}
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left">
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Product
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  SKU
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Price
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Stock
                </th>
                <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-luxe text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {products.map((product) => (
                <tr
                  key={product.id}
                  className="group transition-colors hover:bg-accent/40"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={product.thumbnail}
                          alt={product.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <Link
                          href={`/products/${product.id}`}
                          className="line-clamp-1 font-medium tracking-tight hover:underline"
                        >
                          {product.title}
                        </Link>
                        <span className="text-xs text-muted-foreground">
                          {titleCaseSlug(product.category)}
                          {product.brand ? ` · ${product.brand}` : ""}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs text-muted-foreground">
                    {product.sku || "—"}
                  </td>
                  <td className="px-6 py-4 font-medium tabular-nums">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="px-6 py-4">
                    <StockIndicator stock={product.stock} />
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={
                        product.status === "inactive"
                          ? "inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
                          : "inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                      }
                    >
                      <span
                        className={
                          product.status === "inactive"
                            ? "h-1.5 w-1.5 rounded-full bg-muted-foreground"
                            : "h-1.5 w-1.5 rounded-full bg-foreground"
                        }
                      />
                      {product.status === "inactive" ? "Inactive" : "Active"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`View ${product.title}`}
                        asChild
                      >
                        <Link href={`/products/${product.id}`}>
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label={`Edit ${product.title}`}
                        onClick={() => openEdit(product)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${product.title}`}
                        onClick={() => setDeleteId(product.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          basePath="/admin/products"
          searchParams={{
            q: currentQuery,
            category: currentCategory,
            status: currentStatus,
            sortBy: currentSort,
          }}
        />
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        categories={categories}
      />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              The product will be permanently removed from the catalog. Existing
              orders referencing it are preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
