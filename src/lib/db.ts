/**
 * Database connection — Mongoose.
 *
 * Exports a `db` object with all models for convenience, plus a `connectDB`
 * function that establishes the connection (idempotent — safe to call on
 * every request, returns immediately if already connected).
 *
 * The auto-seed check runs on the first successful connection so the
 * catalog is never empty on a fresh database.
 */
import { connectDB, UserModel, ProductModel, CategoryModel, OrderModel, OrderItemModel, AddressModel, WishlistItemModel, CompareItemModel, CouponModel, RefreshTokenModel } from "./models";

/** Connect to MongoDB on first import (idempotent). */
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => import("./auto-seed").then(({ ensureSeeded }) => ensureSeeded()))
    .catch((err) => console.error("MongoDB connection error:", err));
}

/** Convenience namespace — all Mongoose models in one `db` object so the
 *  service layer reads cleanly. */
export const db = {
  user: UserModel,
  product: ProductModel,
  category: CategoryModel,
  order: OrderModel,
  orderItem: OrderItemModel,
  address: AddressModel,
  wishlistItem: WishlistItemModel,
  compareItem: CompareItemModel,
  coupon: CouponModel,
  refreshToken: RefreshTokenModel,
};

export { connectDB };
