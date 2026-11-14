import { hash, verify } from "@node-rs/argon2";
import { z } from "zod";

/**
 * OWASP Recommended Minimum Parameters for Argon2id Password Hashing:
 * - Algorithm: Argon2id (hybrid data-dependent / data-independent memory-hard function, value 2 in @node-rs/argon2)
 * - Memory cost: 19 MiB (19456 KiB)
 * - Time cost (iterations): 2
 * - Parallelism: 1 thread
 * - Output length: 32 bytes (256 bits)
 */
export const ARGON2ID_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: 2,
} as const;

/**
 * Precomputed, reusable Argon2id hash for anti-enumeration timing attack mitigation.
 * Formatted with the exact same OWASP parameters (19 MiB memory, 2 iterations, 1 parallelism).
 * Generated from an unguessable high-entropy secret, ensuring it can never match a real user password.
 */
export const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$hMif8IwUOBWaaRBDOydJGQ$mhwlEYmDwD/G5Ec4U6rVbEdfg0IsOhmELvM70Auss28";

/**
 * Zod validation schema for usernames:
 * - 3 to 30 characters
 * - Lowercase alphanumeric, underscores, hyphens
 * - Cannot start or end with hyphen or underscore
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/,
    "Username may only contain letters, numbers, underscores, and hyphens, and cannot start or end with a symbol"
  )
  .transform((val) => val.toLowerCase());

/**
 * Zod validation schema for display names:
 * - 1 to 50 characters
 */
export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Display name must be at least 1 character long")
  .max(50, "Display name must be at most 50 characters long");

/**
 * Zod validation schema for passwords:
 * - Minimum 8 characters
 * - Maximum 1024 characters (supports passphrases and password managers without silent truncation)
 * - No arbitrary composition rules (supporting OWASP Password Storage Guidelines)
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(1024, "Password cannot exceed 1024 characters");

/**
 * Hashes a plaintext password using Argon2id with OWASP-recommended parameters.
 * Automatically generates a cryptographically secure random salt internally.
 *
 * @param password Plaintext password to hash
 * @returns Standard PHC string format ($argon2id$v=19$m=19456,t=2,p=1$...)
 */
export async function hashPassword(password: string): Promise<string> {
  const validated = passwordSchema.parse(password);
  return hash(validated, ARGON2ID_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id PHC hash.
 * Constant-time comparison internally protects against timing attacks.
 *
 * @param password Plaintext candidate password
 * @param passwordHash Stored Argon2id PHC hash
 * @returns true if candidate matches hash, false otherwise
 */
export async function verifyPassword(
  password: string,
  passwordHash: string
): Promise<boolean> {
  if (!password || !passwordHash) {
    return false;
  }
  try {
    return await verify(passwordHash, password);
  } catch {
    // Malformed hash or invalid algorithm returns false safely
    return false;
  }
}
