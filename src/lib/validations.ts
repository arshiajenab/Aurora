/**
 * Products validation schemas — shared between Route Handlers and the
 * service layer so the contract is enforced in one place.
 */
import { z } from "zod";

export const productQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  sortBy: z
    .enum([
      "featured",
      "price-asc",
      "price-desc",
      "rating-desc",
      "title-asc",
      "newest",
    ])
    .optional()
    .default("featured"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(48).optional().default(12),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
});

export const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1, "Your bag is empty"),
  customer: z.object({
    fullName: z.string().min(2, "Name is required"),
    email: z.string().email("Valid email is required"),
    address: z.string().min(4, "Address is required"),
    city: z.string().min(2, "City is required"),
    zip: z.string().min(3, "ZIP / postal code is required"),
    country: z.string().min(2, "Country is required"),
  }),
});
