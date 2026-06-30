"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Eyebrow } from "@/shared/components/section-heading";
import { Reveal } from "@/shared/components/reveal";
import { EmptyState } from "@/shared/components/empty-state";
import { addressSchema } from "@/lib/validations";
import type { AddressDto } from "@/services/addresses.service";
import { cn } from "@/lib/utils";

type AddressFormValues = z.input<typeof addressSchema>;

/**
 * /account/addresses — full CRUD for saved shipping addresses.
 *
 * Reads via GET /api/addresses on mount; create/edit via the dialog form;
 * delete via AlertDialog confirmation; set-default via a dedicated endpoint.
 * All mutations refresh the local list optimistically.
 */
export default function AccountAddressesPage() {
  const [addresses, setAddresses] = React.useState<AddressDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AddressDto | null>(null);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [savingDefault, setSavingDefault] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/addresses", { credentials: "same-origin" });
      if (res.ok) {
        const data = (await res.json()) as { addresses: AddressDto[] };
        setAddresses(Array.isArray(data.addresses) ? data.addresses : []);
      }
    } catch {
      /* ignore — toast on action */
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (addr: AddressDto) => {
    setEditing(addr);
    setDialogOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    setSavingDefault(id);
    try {
      const res = await fetch(`/api/addresses/${id}/default`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed to set default");
      await load();
      toast.success("Default address updated");
    } catch {
      toast.error("Could not set default address");
    } finally {
      setSavingDefault(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/addresses/${deleteId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setAddresses((prev) => prev.filter((a) => a.id !== deleteId));
      toast.success("Address removed");
    } catch {
      toast.error("Could not remove address");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <Reveal>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Eyebrow>Delivery</Eyebrow>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Saved addresses
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage the addresses you ship to most often.
            </p>
          </div>
          {addresses.length > 0 && (
            <Button onClick={openCreate} className="gap-1.5 rounded-full">
              <Plus className="h-4 w-4" />
              Add address
            </Button>
          )}
        </div>
      </Reveal>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="h-44 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : addresses.length === 0 ? (
        <Reveal delay={0.05}>
          <EmptyState
            icon={MapPin}
            title="No saved addresses"
            description="Add an address to speed up checkout next time."
            action={
              <Button onClick={openCreate} className="gap-1.5 rounded-full">
                <Plus className="h-4 w-4" />
                Add your first address
              </Button>
            }
          />
        </Reveal>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {addresses.map((addr) => (
              <motion.div
                key={addr.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    "relative flex h-full flex-col gap-3 rounded-2xl border-border/60 p-5",
                    addr.isDefault && "border-foreground/30",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                      </span>
                      {addr.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-background">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Edit address"
                        onClick={() => openEdit(addr)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete address"
                        onClick={() => setDeleteId(addr.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">{addr.fullName}</span>
                    <span className="text-muted-foreground">{addr.line1}</span>
                    {addr.line2 && (
                      <span className="text-muted-foreground">{addr.line2}</span>
                    )}
                    <span className="text-muted-foreground">
                      {addr.city}
                      {addr.state ? `, ${addr.state}` : ""} {addr.zip}
                    </span>
                    <span className="text-muted-foreground">{addr.country}</span>
                    {addr.phone && (
                      <span className="text-muted-foreground">{addr.phone}</span>
                    )}
                  </div>
                  {!addr.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-auto gap-1.5 self-start rounded-full"
                      disabled={savingDefault === addr.id}
                      onClick={() => handleSetDefault(addr.id)}
                    >
                      {savingDefault === addr.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Star className="h-3.5 w-3.5" />
                      )}
                      Set as default
                    </Button>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AddressDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSaved={load}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this address?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The address will no longer be
              available at checkout.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ---------------- Address dialog (create + edit) ---------------- */

function AddressDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AddressDto | null;
  onSaved: () => void;
}) {
  const [submitting, setSubmitting] = React.useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      zip: "",
      country: "",
      phone: "",
      isDefault: false,
    },
  });

  // Reset form values when the dialog opens (for create or edit).
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        fullName: editing.fullName,
        line1: editing.line1,
        line2: editing.line2 ?? "",
        city: editing.city,
        state: editing.state ?? "",
        zip: editing.zip,
        country: editing.country,
        phone: editing.phone ?? "",
        isDefault: editing.isDefault,
      });
    } else {
      form.reset({
        fullName: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        zip: "",
        country: "",
        phone: "",
        isDefault: false,
      });
    }
  }, [open, editing, form]);

  const onSubmit = async (values: AddressFormValues) => {
    setSubmitting(true);
    try {
      const body = {
        ...values,
        line2: values.line2 || null,
        state: values.state || null,
        phone: values.phone || null,
      };
      const res = editing
        ? await fetch(`/api/addresses/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "same-origin",
          })
        : await fetch("/api/addresses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "same-origin",
          });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save address");
      }
      toast.success(editing ? "Address updated" : "Address added");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save address");
    } finally {
      setSubmitting(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit address" : "Add address"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the details for this saved address."
              : "Save a new shipping address for faster checkout."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="line1">Street address</Label>
            <Input id="line1" {...register("line1")} placeholder="123 Market St" />
            {errors.line1 && (
              <p className="text-xs text-destructive">{errors.line1.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="line2">Apartment / suite (optional)</Label>
            <Input id="line2" {...register("line2")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
              {errors.city && (
                <p className="text-xs text-destructive">{errors.city.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="state">State / region</Label>
              <Input id="state" {...register("state")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="zip">ZIP / postal</Label>
              <Input id="zip" {...register("zip")} />
              {errors.zip && (
                <p className="text-xs text-destructive">{errors.zip.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
              {errors.country && (
                <p className="text-xs text-destructive">
                  {errors.country.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Phone (optional)</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
          <label className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
            <Switch
              checked={watch("isDefault")}
              onCheckedChange={(v) => setValue("isDefault", v, { shouldValidate: true })}
            />
            <span className="text-sm">Set as default address</span>
          </label>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Save changes" : "Add address"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
