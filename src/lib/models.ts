/**
 * Mongoose models — all 10 collections in one file for cohesion.
 *
 * Key design decisions:
 *  - Product._id is a Number (preserves the /products/:id URL contract).
 *  - All other models use the default ObjectId _id (serialized as string).
 *  - Compound unique indexes on WishlistItem + CompareItem (userId + productId).
 *  - Json fields (shippingAddress, billingAddress) are plain Mixed objects.
 *  - Timestamps (createdAt, updatedAt) are managed automatically by Mongoose.
 */
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/* ----------------------------- Connection ----------------------------- */

export async function connectDB(): Promise<typeof mongoose> {
  let uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL is not set");
  // Strip surrounding quotes if present (some .env loaders keep them).
  uri = uri.replace(/^["']|["']$/g, "");
  if (mongoose.connection.readyState >= 1) return mongoose;
  return mongoose.connect(uri);
}

/* ------------------------------- User --------------------------------- */

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: null },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    avatar: { type: String, default: null },
    role: { type: String, default: "CUSTOMER" },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: string };

/* ------------------------------ Product ------------------------------- */
// _id is a Number so storefront URLs (/products/1) keep working without
// any changes to the existing routing or service interface.

const productSchema = new Schema(
  {
    _id: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    discountPercentage: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    brand: { type: String, default: null },
    sku: { type: String, default: null, index: true, unique: true, sparse: true },
    weight: { type: Number, default: 0 },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    depth: { type: Number, default: 0 },
    warrantyInformation: { type: String, default: "" },
    shippingInformation: { type: String, default: "" },
    availabilityStatus: { type: String, default: "In Stock" },
    returnPolicy: { type: String, default: "30 days return policy" },
    minimumOrderQuantity: { type: Number, default: 1 },
    thumbnail: { type: String, required: true },
    images: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    status: { type: String, default: "active", index: true },
  },
  { timestamps: true, _id: false },
);
// Override the _id to be a Number (Mongoose defaults to ObjectId otherwise).
productSchema.add({ _id: { type: Number, required: true } });

export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: number };

/* ------------------------------ Category ------------------------------ */

const categorySchema = new Schema(
  {
    _id: { type: String, required: true }, // slug
    name: { type: String, required: true },
    image: { type: String, default: null },
  },
  { timestamps: true },
);

export type CategoryDoc = InferSchemaType<typeof categorySchema> & {
  _id: string;
  slug: string;
};

/* ------------------------------- Order -------------------------------- */

const orderSchema = new Schema(
  {
    number: { type: Number, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, default: "pending", index: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    shippingMethod: { type: String, default: "standard" },
    paymentMethod: { type: String, default: "card" },
    couponCode: { type: String, default: null },
    shippingAddress: { type: Schema.Types.Mixed, default: {} },
    billingAddress: { type: Schema.Types.Mixed, default: {} },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: string };

/* ----------------------------- OrderItem ------------------------------ */

const orderItemSchema = new Schema(
  {
    orderId: { type: String, required: true, index: true },
    productId: { type: Number, required: true, index: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    thumbnail: { type: String, required: true },
  },
  { timestamps: true },
);

export type OrderItemDoc = InferSchemaType<typeof orderItemSchema> & {
  _id: string;
};

/* ------------------------------ Address ------------------------------- */

const addressSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    fullName: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: null },
    city: { type: String, required: true },
    state: { type: String, default: null },
    zip: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, default: null },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AddressDoc = InferSchemaType<typeof addressSchema> & { _id: string };

/* --------------------------- WishlistItem ----------------------------- */

const wishlistItemSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: Number, required: true },
  },
  { timestamps: true },
);
wishlistItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type WishlistItemDoc = InferSchemaType<typeof wishlistItemSchema> & {
  _id: string;
};

/* ---------------------------- CompareItem ----------------------------- */

const compareItemSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    productId: { type: Number, required: true },
  },
  { timestamps: true },
);
compareItemSchema.index({ userId: 1, productId: 1 }, { unique: true });

export type CompareItemDoc = InferSchemaType<typeof compareItemSchema> & {
  _id: string;
};

/* ------------------------------ Coupon -------------------------------- */

const couponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    value: { type: Number, required: true },
    minSubtotal: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CouponDoc = InferSchemaType<typeof couponSchema> & { _id: string };

/* --------------------------- RefreshToken ----------------------------- */

const refreshTokenSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type RefreshTokenDoc = InferSchemaType<typeof refreshTokenSchema> & {
  _id: string;
};

/* --------------------------- Model exports ---------------------------- */

export const UserModel: Model<UserDoc> =
  (mongoose.models.User as Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", userSchema);

export const ProductModel: Model<ProductDoc> =
  (mongoose.models.Product as Model<ProductDoc>) ||
  mongoose.model<ProductDoc>("Product", productSchema);

export const CategoryModel: Model<CategoryDoc> =
  (mongoose.models.Category as Model<CategoryDoc>) ||
  mongoose.model<CategoryDoc>("Category", categorySchema);

export const OrderModel: Model<OrderDoc> =
  (mongoose.models.Order as Model<OrderDoc>) ||
  mongoose.model<OrderDoc>("Order", orderSchema);

export const OrderItemModel: Model<OrderItemDoc> =
  (mongoose.models.OrderItem as Model<OrderItemDoc>) ||
  mongoose.model<OrderItemDoc>("OrderItem", orderItemSchema);

export const AddressModel: Model<AddressDoc> =
  (mongoose.models.Address as Model<AddressDoc>) ||
  mongoose.model<AddressDoc>("Address", addressSchema);

export const WishlistItemModel: Model<WishlistItemDoc> =
  (mongoose.models.WishlistItem as Model<WishlistItemDoc>) ||
  mongoose.model<WishlistItemDoc>("WishlistItem", wishlistItemSchema);

export const CompareItemModel: Model<CompareItemDoc> =
  (mongoose.models.CompareItem as Model<CompareItemDoc>) ||
  mongoose.model<CompareItemDoc>("CompareItem", compareItemSchema);

export const CouponModel: Model<CouponDoc> =
  (mongoose.models.Coupon as Model<CouponDoc>) ||
  mongoose.model<CouponDoc>("Coupon", couponSchema);

export const RefreshTokenModel: Model<RefreshTokenDoc> =
  (mongoose.models.RefreshToken as Model<RefreshTokenDoc>) ||
  mongoose.model<RefreshTokenDoc>("RefreshToken", refreshTokenSchema);
