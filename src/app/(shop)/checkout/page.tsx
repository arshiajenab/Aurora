"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Banknote,
  Check,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/shared/components/empty-state";
import { Eyebrow } from "@/shared/components/section-heading";
import {
  useCartStore,
  selectCartSubtotal,
} from "@/features/cart/store/cart-store";
import { useMounted } from "@/shared/hooks/use-mounted";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  FREE_SHIPPING_THRESHOLD,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AddressDto } from "@/services/addresses.service";
import type { OrderDto } from "@/types";

/**
 * /checkout — enhanced multi-section client checkout.
 *
 * Auth gate (double-guard on top of middleware): if `useAuth().user` is null
 * after loading resolves, we redirect to /signin?callbackUrl=/checkout.
 *
 * Sections (left column):
 *   1. Shipping address — pick a saved address OR enter a new one (+ optional save).
 *   2. Billing address — same as shipping, or different.
 *   3. Shipping method — Standard ($12, 3-5d) / Express ($24, 1-2d).
 *   4. Payment method — Card (simulated, validated) / COD / PayPal.
 *   5. Coupon code — validated via /api/coupons/validate, applied to totals.
 *
 * Order summary (right column, sticky): line items + subtotal + discount +
 * shipping (free if subtotal ≥ $250 and standard) + tax + total + Place order.
 *
 * On submit: RHF + Zod validate; we POST /api/orders with the full payload,
 * optionally POST the new address to /api/addresses, clear the cart, and
 * navigate to /order-success?orderId=…
 */

const COUNTRIES = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "JP", label: "Japan" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "Other", label: "Other / Not listed" },
];

const SHIPPING_METHODS = [
  {
    value: "standard" as const,
    label: "Standard",
    cost: SHIPPING_FLAT_RATE,
    eta: "3-5 business days",
  },
  {
    value: "express" as const,
    label: "Express",
    cost: SHIPPING_FLAT_RATE * 2,
    eta: "1-2 business days",
  },
];

const PAYMENT_METHODS = [
  {
    value: "card" as const,
    label: "Credit / debit card",
    description: "Visa, Mastercard, Amex",
    icon: CreditCard,
  },
  {
    value: "paypal" as const,
    label: "PayPal",
    description: "You'll be redirected to PayPal.",
    icon: Wallet,
  },
  {
    value: "cod" as const,
    label: "Cash on delivery",
    description: "Pay with cash when your order arrives.",
    icon: Banknote,
  },
];

const checkoutSchema = z
  .object({
    shippingAddressChoice: z.string().min(1),
    shipFullName: z.string().optional(),
    shipLine1: z.string().optional(),
    shipLine2: z.string().optional(),
    shipCity: z.string().optional(),
    shipState: z.string().optional(),
    shipZip: z.string().optional(),
    shipCountry: z.string().optional(),
    shipPhone: z.string().optional(),
    saveShippingAddress: z.boolean(),

    billingSameAsShipping: z.boolean(),
    billFullName: z.string().optional(),
    billLine1: z.string().optional(),
    billLine2: z.string().optional(),
    billCity: z.string().optional(),
    billState: z.string().optional(),
    billZip: z.string().optional(),
    billCountry: z.string().optional(),
    billPhone: z.string().optional(),

    shippingMethod: z.enum(["standard", "express"]),
    paymentMethod: z.enum(["card", "cod", "paypal"]),

    cardNumber: z.string().optional(),
    cardName: z.string().optional(),
    cardExpiry: z.string().optional(),
    cardCvc: z.string().optional(),

    couponCode: z.string().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Validate "new" shipping address fields when chosen.
    if (data.shippingAddressChoice === "new") {
      const required = [
        ["shipFullName", "shipFullName", "Full name is required"],
        ["shipLine1", "shipLine1", "Street address is required"],
        ["shipCity", "shipCity", "City is required"],
        ["shipZip", "shipZip", "ZIP / postal code is required"],
        ["shipCountry", "shipCountry", "Country is required"],
      ] as const;
      for (const [field, path, msg] of required) {
        const v = data[field as keyof typeof data] as string | undefined;
        if (!v || v.trim().length < 2) {
          ctx.addIssue({ code: "custom", path: [path], message: msg });
        }
      }
    }
    // Validate billing fields when "same as shipping" is off.
    if (!data.billingSameAsShipping) {
      const required = [
        ["billFullName", "billFullName", "Full name is required"],
        ["billLine1", "billLine1", "Street address is required"],
        ["billCity", "billCity", "City is required"],
        ["billZip", "billZip", "ZIP / postal code is required"],
        ["billCountry", "billCountry", "Country is required"],
      ] as const;
      for (const [field, path, msg] of required) {
        const v = data[field as keyof typeof data] as string | undefined;
        if (!v || v.trim().length < 2) {
          ctx.addIssue({ code: "custom", path: [path], message: msg });
        }
      }
    }
    // Validate card fields when payment method is card.
    if (data.paymentMethod === "card") {
      const digits = (data.cardNumber ?? "").replace(/\s+/g, "");
      if (!/^\d{15,16}$/.test(digits)) {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "Enter a valid 15-16 digit card number",
        });
      }
      if (!data.cardName || data.cardName.trim().length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["cardName"],
          message: "Name on card is required",
        });
      }
      if (!/^\d{2}\s*\/\s*\d{2}$/.test(data.cardExpiry ?? "")) {
        ctx.addIssue({
          code: "custom",
          path: ["cardExpiry"],
          message: "Use MM/YY format",
        });
      }
      if (!/^\d{3,4}$/.test(data.cardCvc ?? "")) {
        ctx.addIssue({
          code: "custom",
          path: ["cardCvc"],
          message: "3-4 digits",
        });
      }
    }
  });

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

interface AppliedCoupon {
  code: string;
  type: "percent" | "fixed";
  value: number;
  discount: number;
  minSubtotal: number;
}

function AddressCard({
  address,
  selected,
  onSelect,
}: {
  address: AddressDto;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
        selected
          ? "border-foreground bg-accent/40"
          : "border-border/60 hover:border-border",
      )}
    >
      <RadioGroupItem
        value={`saved:${address.id}`}
        checked={selected}
        onClick={() => onSelect(address.id)}
        className="mt-1"
      />
      <div className="flex flex-1 flex-col gap-0.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium tracking-tight">{address.fullName}</span>
          {address.isDefault && (
            <Badge variant="secondary" className="text-[10px]">
              Default
            </Badge>
          )}
        </div>
        <span className="text-muted-foreground">{address.line1}</span>
        {address.line2 && (
          <span className="text-muted-foreground">{address.line2}</span>
        )}
        <span className="text-muted-foreground">
          {address.city}
          {address.state ? `, ${address.state}` : ""} {address.zip}
        </span>
        <span className="text-muted-foreground">{address.country}</span>
        {address.phone && (
          <span className="text-muted-foreground">{address.phone}</span>
        )}
      </div>
    </label>
  );
}

type AddressPrefix = "ship" | "bill";

type AddressFieldKey =
  | "FullName"
  | "Line1"
  | "Line2"
  | "City"
  | "State"
  | "Zip"
  | "Phone"
  | "Country";

const ADDRESS_FIELDS: {
  key: AddressFieldKey;
  label: string;
  placeholder: string;
  autoComplete: (prefix: AddressPrefix) => string;
  optional?: boolean;
  colSpan2?: boolean;
}[] = [
  {
    key: "FullName",
    label: "Full name",
    placeholder: "Jane Appleseed",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} name`,
    colSpan2: true,
  },
  {
    key: "Line1",
    label: "Street address",
    placeholder: "123 Lantern Lane",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} address-line1`,
    colSpan2: true,
  },
  {
    key: "Line2",
    label: "Apartment, suite, etc.",
    placeholder: "Apt 4B",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} address-line2`,
    optional: true,
    colSpan2: true,
  },
  {
    key: "City",
    label: "City",
    placeholder: "Brooklyn",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} address-level2`,
  },
  {
    key: "State",
    label: "State / Province",
    placeholder: "NY",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} address-level1`,
  },
  {
    key: "Zip",
    label: "ZIP / Postal",
    placeholder: "11201",
    autoComplete: (p) => `${p === "ship" ? "shipping" : "billing"} postal-code`,
  },
  {
    key: "Phone",
    label: "Phone",
    placeholder: "+1 (555) 000-0000",
    autoComplete: () => "tel",
    optional: true,
  },
];

function addressFieldName(
  prefix: AddressPrefix,
  key: AddressFieldKey,
): keyof CheckoutFormValues {
  return `${prefix}${key}` as keyof CheckoutFormValues;
}

function AddressFields({
  prefix,
  register,
  errors,
  countryValue,
  onCountryChange,
}: {
  prefix: AddressPrefix;
  register: ReturnType<typeof useForm<CheckoutFormValues>>["register"];
  errors: ReturnType<typeof useForm<CheckoutFormValues>>["formState"]["errors"];
  countryValue: string;
  onCountryChange: (v: string) => void;
}) {
  const countryName = addressFieldName(prefix, "Country");
  const countryError = errors[countryName];
  const countryId = countryName;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {ADDRESS_FIELDS.map((f) => {
        const name = addressFieldName(prefix, f.key);
        const error = errors[name];
        const id = name;
        return (
          <div
            key={f.key}
            className={cn(
              "flex flex-col gap-1.5",
              f.colSpan2 && "sm:col-span-2",
            )}
          >
            <Label htmlFor={id}>
              {f.label}{" "}
              {f.optional && (
                <span className="text-muted-foreground">(optional)</span>
              )}
            </Label>
            <Input
              id={id}
              autoComplete={f.autoComplete(prefix)}
              placeholder={f.placeholder}
              aria-invalid={!!error}
              {...register(name)}
            />
            {error && (
              <p className="text-xs text-destructive">{String(error.message)}</p>
            )}
          </div>
        );
      })}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={countryId}>Country</Label>
        <Select value={countryValue} onValueChange={onCountryChange}>
          <SelectTrigger
            id={countryId}
            className="w-full"
            aria-label="Country"
            aria-invalid={!!countryError}
          >
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {countryError && (
          <p className="text-xs text-destructive">
            {String(countryError.message)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const mounted = useMounted();
  const { user, loading: authLoading } = useAuth();

  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore(selectCartSubtotal);
  const clearCart = useCartStore((s) => s.clear);

  const [addresses, setAddresses] = React.useState<AddressDto[]>([]);
  const [addressesLoading, setAddressesLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  // Set true right before clearCart() so the empty-cart redirect effect
  // doesn't race with the /order-success navigation.
  const orderPlaced = React.useRef(false);
  const [appliedCoupon, setAppliedCoupon] = React.useState<AppliedCoupon | null>(null);
  const [couponInput, setCouponInput] = React.useState("");
  const [couponBusy, setCouponBusy] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddressChoice: "new",
      shipCountry: "US",
      billCountry: "US",
      billingSameAsShipping: true,
      saveShippingAddress: false,
      shippingMethod: "standard",
      paymentMethod: "card",
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvc: "",
      couponCode: null,
    },
    mode: "onBlur",
  });

  const shippingAddressChoice = watch("shippingAddressChoice");
  const billingSameAsShipping = watch("billingSameAsShipping");
  const saveShippingAddress = watch("saveShippingAddress");
  const shippingMethod = watch("shippingMethod");
  const paymentMethod = watch("paymentMethod");

  // Auth gate — middleware already protects this route, but we double-guard.
  React.useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace("/signin?callbackUrl=/checkout");
    }
  }, [mounted, authLoading, user, router]);

  // Fetch saved addresses.
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setAddressesLoading(true);
    fetch("/api/addresses", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { addresses: AddressDto[] };
        return data.addresses;
      })
      .then((list) => {
        if (cancelled || !list) return;
        setAddresses(list);
        const defaultAddr = list.find((a) => a.isDefault) ?? list[0];
        if (defaultAddr) {
          setValue("shippingAddressChoice", `saved:${defaultAddr.id}`);
        }
      })
      .catch(() => {
        /* non-critical — user can enter a new address */
      })
      .finally(() => {
        if (!cancelled) setAddressesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, setValue]);

  // Empty-cart redirect (after mount + auth resolved, so we don't bounce
  // users who are still loading their persisted cart). Suppressed when an
  // order was just placed (clearCart runs before the success redirect).
  React.useEffect(() => {
    if (mounted && !authLoading && user && items.length === 0 && !orderPlaced.current) {
      router.replace("/cart");
    }
  }, [mounted, authLoading, user, items.length, router]);

  const discount = appliedCoupon?.discount ?? 0;
  const shippingCost = React.useMemo(() => {
    const afterDiscount = Math.max(0, subtotal - discount);
    if (afterDiscount >= FREE_SHIPPING_THRESHOLD) return 0;
    if (subtotal === 0) return 0;
    return SHIPPING_METHODS.find((m) => m.value === shippingMethod)?.cost ?? SHIPPING_FLAT_RATE;
  }, [subtotal, discount, shippingMethod]);

  const taxable = Math.max(0, subtotal - discount);
  const tax = Number((taxable * TAX_RATE).toFixed(2));
  const total = Number((taxable + shippingCost + tax).toFixed(2));

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a coupon code");
      return;
    }
    setCouponBusy(true);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal }),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as {
        coupon?: AppliedCoupon;
        error?: string;
      };
      if (!res.ok || !data.coupon) {
        throw new Error(data.error ?? "Invalid coupon");
      }
      setAppliedCoupon(data.coupon);
      setValue("couponCode", data.coupon.code);
      toast.success("Coupon applied", {
        description: `${data.coupon.code} — ${formatCurrency(data.coupon.discount)} off`,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Couldn't apply coupon";
      toast.error("Coupon not applied", { description: message });
    } finally {
      setCouponBusy(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setValue("couponCode", null);
    setCouponInput("");
    toast.success("Coupon removed");
  };

  const resolveShippingAddress = (
    values: CheckoutFormValues,
  ): { dto: Omit<AddressDto, "id" | "isDefault" | "createdAt" | "updatedAt">; id: string | null } => {
    if (values.shippingAddressChoice.startsWith("saved:")) {
      const id = values.shippingAddressChoice.slice("saved:".length);
      const found = addresses.find((a) => a.id === id);
      if (!found) throw new Error("Selected address not found");
      return {
        id: found.id,
        dto: {
          fullName: found.fullName,
          line1: found.line1,
          line2: found.line2,
          city: found.city,
          state: found.state,
          zip: found.zip,
          country: found.country,
          phone: found.phone,
        },
      };
    }
    return {
      id: null,
      dto: {
        fullName: values.shipFullName ?? "",
        line1: values.shipLine1 ?? "",
        line2: values.shipLine2 ?? null,
        city: values.shipCity ?? "",
        state: values.shipState ?? null,
        zip: values.shipZip ?? "",
        country: values.shipCountry ?? "",
        phone: values.shipPhone ?? null,
      },
    };
  };

  const resolveBillingAddress = (
    values: CheckoutFormValues,
    shippingDto: ReturnType<typeof resolveShippingAddress>["dto"],
  ) => {
    if (values.billingSameAsShipping) return shippingDto;
    return {
      fullName: values.billFullName ?? "",
      line1: values.billLine1 ?? "",
      line2: values.billLine2 ?? null,
      city: values.billCity ?? "",
      state: values.billState ?? null,
      zip: values.billZip ?? "",
      country: values.billCountry ?? "",
      phone: values.billPhone ?? null,
    };
  };

  const onSubmit = async (values: CheckoutFormValues) => {
    if (items.length === 0) {
      toast.error("Your bag is empty", {
        description: "Add items before checking out.",
      });
      return;
    }
    if (!user) {
      router.replace("/signin?callbackUrl=/checkout");
      return;
    }
    setSubmitting(true);
    try {
      const { dto: shippingDto, id: shippingId } = resolveShippingAddress(values);
      const billingDto = resolveBillingAddress(values, shippingDto);

      // If "Save this address" was checked and the user entered a new one,
      // persist it (best-effort — don't block checkout on failure).
      if (
        values.saveShippingAddress &&
        values.shippingAddressChoice === "new"
      ) {
        fetch("/api/addresses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: shippingDto.fullName,
            line1: shippingDto.line1,
            line2: shippingDto.line2,
            city: shippingDto.city,
            state: shippingDto.state,
            zip: shippingDto.zip,
            country: shippingDto.country,
            phone: shippingDto.phone,
            isDefault: false,
          }),
          credentials: "same-origin",
        }).catch(() => {
          /* non-critical */
        });
      }

      const payload = {
        items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        customer: {
          fullName: shippingDto.fullName,
          email: user.email,
          address: shippingDto.line1,
          city: shippingDto.city,
          zip: shippingDto.zip,
          country: shippingDto.country,
        },
        shippingAddress: shippingDto,
        billingAddress: billingDto,
        shippingMethod: values.shippingMethod,
        paymentMethod: values.paymentMethod,
        couponCode: appliedCoupon?.code ?? null,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "same-origin",
      });
      const data = (await res.json().catch(() => ({}))) as
        | OrderDto
        | { error?: string };
      if (!res.ok) {
        const message =
          "error" in data && data.error
            ? data.error
            : `Checkout failed (${res.status})`;
        throw new Error(message);
      }
      const order = data as OrderDto;
      orderPlaced.current = true;
      clearCart();
      toast.success("Order placed", {
        description: `Confirmation #${order.number}`,
      });
      router.push(`/order-success?orderId=${encodeURIComponent(order.id)}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error("Checkout failed", { description: message });
      setSubmitting(false);
    }
  };

  // Pre-mount: stable skeleton (avoid hydration mismatch with persisted cart).
  if (!mounted || authLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Preparing checkout…</p>
        </div>
      </div>
    );
  }

  // Auth-gate fallback (middleware should already have redirected; this is
  // a defensive fallback if the user lands here without a session).
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-3 py-20">
          <Lock className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Redirecting to sign-in…
          </p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="You'll need to add items to your bag before you can check out."
          action={
            <Button asChild className="rounded-full">
              <Link href="/products">Browse the catalog</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Checkout</Eyebrow>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
          <Button asChild variant="ghost" size="sm" className="gap-1.5 rounded-full">
            <Link href="/cart">
              <ArrowLeft className="h-4 w-4" />
              Back to bag
            </Link>
          </Button>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_400px]"
        noValidate
      >
        {/* Left column — sections */}
        <div className="flex flex-col gap-8">
          {/* 1. Shipping address */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                1
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Shipping address
              </h2>
            </div>

            {addressesLoading ? (
              <div className="h-24 w-full skeleton-shimmer rounded-xl" />
            ) : addresses.length > 0 ? (
              <RadioGroup
                value={shippingAddressChoice}
                onValueChange={(v) =>
                  setValue("shippingAddressChoice", v, { shouldValidate: true })
                }
                className="gap-3"
              >
                {addresses.map((a) => (
                  <AddressCard
                    key={a.id}
                    address={a}
                    selected={shippingAddressChoice === `saved:${a.id}`}
                    onSelect={(id) =>
                      setValue("shippingAddressChoice", `saved:${id}`, {
                        shouldValidate: true,
                      })
                    }
                  />
                ))}
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-4 transition-colors",
                    shippingAddressChoice === "new"
                      ? "border-foreground bg-accent/40"
                      : "border-border/60 hover:border-border",
                  )}
                >
                  <RadioGroupItem
                    value="new"
                    checked={shippingAddressChoice === "new"}
                    onClick={() =>
                      setValue("shippingAddressChoice", "new", {
                        shouldValidate: true,
                      })
                    }
                  />
                  <Plus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Use a new address</span>
                </label>
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter the address you&apos;d like your order shipped to.
              </p>
            )}

            {shippingAddressChoice === "new" && (
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:p-5">
                <AddressFields
                  prefix="ship"
                  register={register}
                  errors={errors}
                  countryValue={watch("shipCountry") ?? ""}
                  onCountryChange={(v) =>
                    setValue("shipCountry", v, { shouldValidate: true })
                  }
                />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!saveShippingAddress}
                    onCheckedChange={(v) =>
                      setValue("saveShippingAddress", v === true, { shouldValidate: false })
                    }
                  />
                  <span className="text-muted-foreground">
                    Save this address to my account
                  </span>
                </label>
              </div>
            )}
          </section>

          <Separator />

          {/* 2. Billing address */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                2
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Billing address
              </h2>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={!!billingSameAsShipping}
                onCheckedChange={(v) =>
                  setValue("billingSameAsShipping", v === true, { shouldValidate: true })
                }
              />
              <span>Billing address is the same as shipping address</span>
            </label>
            {!billingSameAsShipping && (
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:p-5">
                <AddressFields
                  prefix="bill"
                  register={register}
                  errors={errors}
                  countryValue={watch("billCountry") ?? ""}
                  onCountryChange={(v) =>
                    setValue("billCountry", v, { shouldValidate: true })
                  }
                />
              </div>
            )}
          </section>

          <Separator />

          {/* 3. Shipping method */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                3
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Shipping method
              </h2>
            </div>
            <RadioGroup
              value={shippingMethod}
              onValueChange={(v) =>
                setValue("shippingMethod", v as "standard" | "express", {
                  shouldValidate: true,
                })
              }
              className="gap-3"
            >
              {SHIPPING_METHODS.map((m) => {
                const isFree =
                  Math.max(0, subtotal - discount) >= FREE_SHIPPING_THRESHOLD &&
                  m.value === "standard";
                return (
                  <label
                    key={m.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                      shippingMethod === m.value
                        ? "border-foreground bg-accent/40"
                        : "border-border/60 hover:border-border",
                    )}
                  >
                    <RadioGroupItem
                      value={m.value}
                      checked={shippingMethod === m.value}
                    />
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.eta}
                      </span>
                    </div>
                    <span className="text-sm font-medium tabular-nums">
                      {isFree ? "Free" : formatCurrency(m.cost)}
                    </span>
                  </label>
                );
              })}
            </RadioGroup>
          </section>

          <Separator />

          {/* 4. Payment method */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                4
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Payment method
              </h2>
            </div>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) =>
                setValue("paymentMethod", v as "card" | "cod" | "paypal", {
                  shouldValidate: true,
                })
              }
              className="gap-3"
            >
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <label
                    key={m.value}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-colors",
                      paymentMethod === m.value
                        ? "border-foreground bg-accent/40"
                        : "border-border/60 hover:border-border",
                    )}
                  >
                    <RadioGroupItem
                      value={m.value}
                      checked={paymentMethod === m.value}
                    />
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{m.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {m.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>

            {paymentMethod === "card" && (
              <div className="flex flex-col gap-4 rounded-xl border border-border/60 p-4 sm:p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="cardNumber">Card number</Label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="cardNumber"
                        inputMode="numeric"
                        autoComplete="cc-number"
                        placeholder="4242 4242 4242 4242"
                        className="pl-9 font-mono"
                        aria-invalid={!!errors.cardNumber}
                        {...register("cardNumber")}
                      />
                    </div>
                    {errors.cardNumber && (
                      <p className="text-xs text-destructive">
                        {errors.cardNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <Label htmlFor="cardName">Name on card</Label>
                    <Input
                      id="cardName"
                      autoComplete="cc-name"
                      placeholder="Jane Appleseed"
                      aria-invalid={!!errors.cardName}
                      {...register("cardName")}
                    />
                    {errors.cardName && (
                      <p className="text-xs text-destructive">
                        {errors.cardName.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cardExpiry">Expiry</Label>
                    <Input
                      id="cardExpiry"
                      autoComplete="cc-exp"
                      placeholder="MM / YY"
                      className="font-mono"
                      aria-invalid={!!errors.cardExpiry}
                      {...register("cardExpiry")}
                    />
                    {errors.cardExpiry && (
                      <p className="text-xs text-destructive">
                        {errors.cardExpiry.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cardCvc">CVC</Label>
                    <Input
                      id="cardCvc"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      placeholder="123"
                      className="font-mono"
                      aria-invalid={!!errors.cardCvc}
                      {...register("cardCvc")}
                    />
                    {errors.cardCvc && (
                      <p className="text-xs text-destructive">
                        {errors.cardCvc.message}
                      </p>
                    )}
                  </div>
                </div>
                <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Simulated payment — no real card is charged. Use any test
                  number (e.g. 4242 4242 4242 4242).
                </p>
              </div>
            )}
          </section>

          <Separator />

          {/* 5. Coupon code */}
          <section className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-semibold text-background tabular-nums">
                5
              </span>
              <h2 className="text-base font-semibold tracking-tight">
                Coupon code
              </h2>
            </div>
            {appliedCoupon ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-foreground/30 bg-accent/40 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background">
                    <Check className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {appliedCoupon.type === "percent"
                        ? `${appliedCoupon.value}% off`
                        : `${formatCurrency(appliedCoupon.value)} off`}{" "}
                      · −{formatCurrency(appliedCoupon.discount)}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeCoupon}
                  className="gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                  <Label htmlFor="couponInput" className="sr-only">
                    Coupon code
                  </Label>
                  <div className="relative">
                    <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="couponInput"
                      placeholder="WELCOME10"
                      className="pl-9 uppercase"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          applyCoupon();
                        }
                      }}
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={couponBusy}
                  className="gap-1.5 rounded-full"
                >
                  {couponBusy ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/40 border-t-foreground" />
                      Applying…
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Apply
                    </>
                  )}
                </Button>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              Try{" "}
              <button
                type="button"
                onClick={() => setCouponInput("WELCOME10")}
                className="font-mono underline-offset-2 hover:underline"
              >
                WELCOME10
              </button>{" "}
              for 10% off.
            </p>
          </section>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Secure, encrypted checkout
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              2-year warranty on every order
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Free standard shipping over {formatCurrency(FREE_SHIPPING_THRESHOLD)}
            </span>
          </div>
        </div>

        {/* Right column — order summary */}
        <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/60 p-6">
            <h2 className="text-base font-semibold tracking-tight">
              Order summary
            </h2>

            <ul className="mt-5 flex max-h-72 flex-col gap-4 overflow-y-auto scrollbar-thin pr-1">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
                    <Image
                      src={item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                    <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background tabular-nums">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="line-clamp-1 text-xs font-medium tracking-tight">
                      {item.title}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatCurrency(item.price)} each
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            <Separator className="my-5" />

            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(subtotal)}
                </dd>
              </div>
              {discount > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">
                    Discount{" "}
                    {appliedCoupon && (
                      <span className="font-mono text-xs">
                        ({appliedCoupon.code})
                      </span>
                    )}
                  </dt>
                  <dd className="font-medium tabular-nums text-foreground">
                    −{formatCurrency(discount)}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Shipping</dt>
                <dd className="font-medium tabular-nums">
                  {shippingCost === 0 ? "Free" : formatCurrency(shippingCost)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  Tax ({(TAX_RATE * 100).toFixed(0)}%)
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatCurrency(tax)}
                </dd>
              </div>

              <Separator className="my-1" />

              <div className="flex items-baseline justify-between">
                <dt className="text-sm font-medium">Total</dt>
                <dd className="text-xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(total)}
                </dd>
              </div>
            </dl>

            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="mt-6 w-full gap-2 rounded-full"
            >
              {submitting ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-background/40 border-t-background" />
                  Placing order…
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Place order · {formatCurrency(total)}
                </>
              )}
            </Button>

            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              By placing your order, you agree to our terms &amp; privacy policy.
            </p>
          </Card>
        </aside>
      </form>
    </div>
  );
}
