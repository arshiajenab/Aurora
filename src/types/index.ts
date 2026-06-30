/**
 * Domain types — the single source of truth for product/order shapes.
 * These are intentionally decoupled from the DummyJSON wire format so the
 * persistence layer (and the UI) never needs to change when we swap APIs.
 */

export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  /** Original price before discount, derived from price + discountPercentage. */
  priceBeforeDiscount: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  tags: string[];
  brand: string | null;
  sku: string;
  weight: number;
  dimensions: ProductDimensions;
  warrantyInformation: string;
  shippingInformation: string;
  availabilityStatus: string;
  reviews: ProductReview[];
  returnPolicy: string;
  minimumOrderQuantity: number;
  meta: ProductMeta;
  thumbnail: string;
  images: string[];
}

export interface ProductDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface ProductReview {
  rating: number;
  comment: string;
  date: string;
  reviewerName: string;
  reviewerEmail: string;
}

export interface ProductMeta {
  createdAt: string;
  updatedAt: string;
  barcode: string;
  qrCode: string;
}

export interface ProductCategory {
  slug: string;
  name: string;
  /** A representative image URL for the category. */
  image: string;
}

/* ---------------- Pagination ---------------- */

export interface Paginated<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  page: number;
  totalPages: number;
}

/* ---------------- Query params ---------------- */

export type SortOption =
  | "featured"
  | "price-asc"
  | "price-desc"
  | "rating-desc"
  | "title-asc"
  | "newest";

export interface ProductQuery {
  search?: string;
  category?: string;
  sortBy?: SortOption;
  /** 1-based page index. */
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  tags?: string[];
}

/* ---------------- Cart & Wishlist ---------------- */

export interface CartItem {
  id: number;
  title: string;
  price: number;
  thumbnail: string;
  category: string;
  quantity: number;
  /** Snapshotted to keep historical price integrity. */
  maxStock: number;
}

export interface WishlistItem {
  id: number;
  title: string;
  thumbnail: string;
  price: number;
  addedAt: number;
}

export interface RecentlyViewedItem {
  id: number;
  title: string;
  thumbnail: string;
  price: number;
  viewedAt: number;
}

/* ---------------- Orders (mock) ---------------- */

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: number;
  title: string;
  price: number;
  quantity: number;
  thumbnail: string;
}

export interface Order {
  id: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  customer: {
    fullName: string;
    email: string;
    address: string;
    city: string;
    zip: string;
    country: string;
  };
}

/* ---------------- Admin analytics (mock) ---------------- */

export interface AdminKpi {
  label: string;
  value: string;
  delta: number;
  trend: "up" | "down" | "flat";
}

export interface RevenuePoint {
  label: string;
  revenue: number;
  orders: number;
}
