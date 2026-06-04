import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEYLEN = 64;
const SALT_BYTES = 16;

/**
 * Hash a PIN using Node's built-in scrypt. Output format is
 * `scrypt$<saltHex>$<hashHex>` so future hash-algorithm rotations can be
 * detected from the prefix without breaking older rows.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scrypt(pin, salt, KEYLEN);
  return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`;
}

/** Verify a PIN against a stored hash. Constant-time comparison. */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  let derived: Buffer;
  try {
    derived = await scrypt(pin, salt, expected.length);
  } catch {
    return false;
  }
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
