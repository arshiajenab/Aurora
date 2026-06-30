/**
 * Addresses service — CRUD + default management (Mongoose).
 */
import { db } from "@/lib/db";
import { connectDB } from "@/lib/models";
import mongoose from "mongoose";

export class AddressesServiceError extends Error {
  constructor(
    message: string,
    public readonly code: "not-found" | "invalid",
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AddressesServiceError";
  }
}

export interface AddressDto {
  id: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  zip: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AddressLean {
  _id: string;
  userId: string;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  zip: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toDto(a: AddressLean): AddressDto {
  const createdAt =
    a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
  const updatedAt =
    a.updatedAt instanceof Date ? a.updatedAt : new Date(a.updatedAt);
  return {
    id: String(a._id),
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    phone: a.phone,
    isDefault: a.isDefault,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

async function ensureConn() {
  if (mongoose.connection.readyState < 1) await connectDB();
}

export const addressesService = {
  async list(userId: string): Promise<AddressDto[]> {
    await ensureConn();
    const rows = (await db.address
      .find({ userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()) as AddressLean[];
    return rows.map(toDto);
  },

  async create(
    userId: string,
    input: {
      fullName: string;
      line1: string;
      line2?: string | null;
      city: string;
      state?: string | null;
      zip: string;
      country: string;
      phone?: string | null;
      isDefault?: boolean;
    },
  ): Promise<AddressDto> {
    await ensureConn();
    if (input.isDefault) {
      await db.address.updateMany({ userId }, { $set: { isDefault: false } });
    }
    const count = await db.address.countDocuments({ userId });
    const row = (await db.address.create({
      userId,
      fullName: input.fullName,
      line1: input.line1,
      line2: input.line2 ?? null,
      city: input.city,
      state: input.state ?? null,
      zip: input.zip,
      country: input.country,
      phone: input.phone ?? null,
      isDefault: input.isDefault ?? count === 0,
    })) as unknown as AddressLean;
    return toDto(row);
  },

  async update(
    userId: string,
    id: string,
    input: Partial<{
      fullName: string;
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      zip: string;
      country: string;
      phone: string | null;
      isDefault: boolean;
    }>,
  ): Promise<AddressDto> {
    await ensureConn();
    if (input.isDefault) {
      await db.address.updateMany({ userId }, { $set: { isDefault: false } });
    }
    const row = (await db.address
      .findOneAndUpdate({ _id: id, userId }, { $set: input }, { new: true })
      .lean()) as AddressLean | null;
    if (!row) {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
    return toDto(row);
  },

  async delete(userId: string, id: string): Promise<void> {
    await ensureConn();
    const result = await db.address.deleteOne({ _id: id, userId });
    if (result.deletedCount === 0) {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
  },

  async setDefault(userId: string, id: string): Promise<AddressDto> {
    await ensureConn();
    await db.address.updateMany({ userId }, { $set: { isDefault: false } });
    const row = (await db.address
      .findOneAndUpdate(
        { _id: id, userId },
        { $set: { isDefault: true } },
        { new: true },
      )
      .lean()) as AddressLean | null;
    if (!row) {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
    return toDto(row);
  },
};
