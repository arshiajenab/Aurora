/**
 * Validation schemas — Zod. Shared between Route Handlers and client forms
 * (React Hook Form via @hookform/resolvers) so the contract is enforced in
 * exactly one place.
 */
import { z } from "zod";

/* ---------------- Products ---------------- */

export const productQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sortBy: z
    .enum(["featured", "price-asc", "price-desc", "rating-desc", "title-asc", "newest"])
    .optional()
    .default("featured"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(12),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export const adminProductQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  q: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["active", "inactive", "all"]).optional().default("all"),
});

export const createProductSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  price: z.coerce.number().min(0, "Price must be positive"),
  discountPercentage: z.coerce.number().min(0).max(100).optional().default(0),
  stock: z.coerce.number().int().min(0, "Stock must be 0 or more"),
  tags: z.array(z.string()).optional().default([]),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  thumbnail: z.string().min(1, "Thumbnail is required"),
  images: z.array(z.string()).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  warrantyInformation: z.string().optional().default(""),
  shippingInformation: z.string().optional().default(""),
  returnPolicy: z.string().optional().default("30 days return policy"),
  minimumOrderQuantity: z.coerce.number().int().min(1).optional().default(1),
  weight: z.coerce.number().min(0).optional().default(0),
  width: z.coerce.number().min(0).optional().default(0),
  height: z.coerce.number().min(0).optional().default(0),
  depth: z.coerce.number().min(0).optional().default(0),
});

export const updateProductSchema = createProductSchema.partial();

/* ---------------- Auth ---------------- */

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

/* ---------------- Checkout / Orders ---------------- */

export const checkoutSchema = z.object({
  items: z
    .array(z.object({ id: z.number().int(), quantity: z.number().int().min(1) }))
    .min(1, "Your bag is empty"),
  customer: z.object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Valid email is required"),
    address: z.string().min(4, "Address is required"),
    city: z.string().min(2, "City is required"),
    zip: z.string().min(3, "ZIP / postal code is required"),
    country: z.string().min(2, "Country is required"),
  }),
  shippingAddress: z.record(z.string(), z.unknown()).default({}),
  billingAddress: z.record(z.string(), z.unknown()).default({}),
  shippingMethod: z.enum(["standard", "express"]).default("standard"),
  paymentMethod: z.enum(["card", "cod", "paypal"]).default("card"),
  couponCode: z.string().nullable().optional(),
});

export const orderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

/* ---------------- Addresses ---------------- */

export const addressSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  line1: z.string().min(4, "Street address is required"),
  line2: z.string().nullable().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().nullable().optional(),
  zip: z.string().min(3, "ZIP / postal code is required"),
  country: z.string().min(2, "Country is required"),
  phone: z.string().nullable().optional(),
  isDefault: z.boolean().optional().default(false),
});

/* ---------------- Profile ---------------- */

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name is required").optional(),
  phone: z.string().nullable().optional(),
  avatar: z.string().nullable().optional(),
});

/* ---------------- Coupons ---------------- */

export const couponValidateSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  subtotal: z.coerce.number().min(0),
});
