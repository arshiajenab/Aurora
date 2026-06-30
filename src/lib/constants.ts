/**
 * App-wide constants. Centralised so copy and config never get sprinkled
 * across components.
 */

export const SITE = {
  name: "Aurora",
  tagline: "Objects of quiet intention.",
  description:
    "Aurora is a curated marketplace for considered objects — minimal design, honest materials, lasting value.",
  url: "https://aurora.shop",
  locale: "en_US",
  twitter: "@aurora",
  email: "hello@aurora.shop",
} as const;

export const NAV_LINKS = [
  { label: "Shop", href: "/products" },
  { label: "Categories", href: "/categories" },
  { label: "Compare", href: "/compare" },
  { label: "Admin", href: "/admin" },
] as const;

/** Domain-level sort options exposed to the UI. */
export const SORT_OPTIONS: { value: import("@/types").SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Top Rated" },
  { value: "title-asc", label: "Alphabetical" },
];

export const PRODUCTS_PER_PAGE = 12;

/** Pricing constants for the mock checkout. */
export const SHIPPING_FLAT_RATE = 12;
export const TAX_RATE = 0.08;
export const FREE_SHIPPING_THRESHOLD = 250;
