/**
 * Password hashing — bcryptjs runs in the Node runtime (Route Handlers),
 * never in middleware/edge. Cost factor 10 balances security and latency.
 */
import bcrypt from "bcryptjs";

const SALT_ROUNUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
