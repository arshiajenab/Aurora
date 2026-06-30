/**
 * Addresses service — CRUD + default management.
 */
import { db } from "@/lib/db";

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

function toDto(a: {
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
  createdAt: Date;
  updatedAt: Date;
}): AddressDto {
  return {
    id: a.id,
    fullName: a.fullName,
    line1: a.line1,
    line2: a.line2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    phone: a.phone,
    isDefault: a.isDefault,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export const addressesService = {
  async list(userId: string): Promise<AddressDto[]> {
    const rows = await db.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
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
    // Sequential ops (avoids $transaction — needs replica set on standalone MongoDB).
    if (input.isDefault) {
      await db.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    // If this is the user's first address, force it to default.
    const count = await db.address.count({ where: { userId } });
    const row = await db.address.create({
      data: {
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
      },
    });
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
    // Sequential ops (avoids $transaction — needs replica set on standalone MongoDB).
    if (input.isDefault) {
      await db.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
    try {
      const row = await db.address.update({
        where: { id, userId },
        data: input as never,
      });
      return toDto(row);
    } catch {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
  },

  async delete(userId: string, id: string): Promise<void> {
    try {
      await db.address.delete({ where: { id, userId } });
    } catch {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
  },

  async setDefault(userId: string, id: string): Promise<AddressDto> {
    // Sequential ops (avoids $transaction — needs replica set on standalone MongoDB).
    await db.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
    try {
      const row = await db.address.update({
        where: { id, userId },
        data: { isDefault: true },
      });
      return toDto(row);
    } catch {
      throw new AddressesServiceError("Address not found", "not-found", 404);
    }
  },
};
