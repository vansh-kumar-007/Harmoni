import "server-only";
import crypto from "node:crypto";
import { z } from "zod";
import db from "@/lib/db";

/**
 * Default and boundary constants for administrator invitation codes.
 */
export const DEFAULT_INVITE_EXPIRATION_DAYS = 7;
export const MIN_INVITE_EXPIRATION_DAYS = 1;
export const MAX_INVITE_EXPIRATION_DAYS = 30;

/**
 * Zod validation schema for incoming invitation codes.
 * Ensures the code is non-empty and reasonably bounded.
 */
export const inviteCodeSchema = z
  .string()
  .trim()
  .min(16, "Invitation code must be at least 16 characters long")
  .max(128, "Invitation code cannot exceed 128 characters");

/**
 * Zod validation schema for administrator invitation creation payloads.
 */
export const createInviteSchema = z.object({
  expiresInDays: z
    .number()
    .int("Expiration must be an integer number of days")
    .min(MIN_INVITE_EXPIRATION_DAYS, `Expiration must be at least ${MIN_INVITE_EXPIRATION_DAYS} day`)
    .max(MAX_INVITE_EXPIRATION_DAYS, `Expiration cannot exceed ${MAX_INVITE_EXPIRATION_DAYS} days`)
    .optional(),
});

export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/**
 * Computes a deterministic SHA-256 digest of a raw invitation code.
 * Only the digest is persisted in PostgreSQL to protect against database dump leaks.
 *
 * @param rawCode The plaintext invitation code
 * @returns 64-character lowercase hex digest
 */
export function hashInviteCode(rawCode: string): string {
  return crypto.createHash("sha256").update(rawCode.trim()).digest("hex");
}

/**
 * Generates a cryptographically secure random invitation code.
 * Produces 256 bits (32 bytes) of entropy formatted as a 64-character hex string.
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates and stores a new invitation code record in PostgreSQL.
 * Only the SHA-256 hash is persisted. The raw invitation code is returned
 * exactly once so the administrator can distribute it.
 *
 * @param params Parameters including administrator user ID and optional expiration days
 * @returns The created invitation record metadata and the one-time raw invitation code
 */
export async function createInviteCode(params: {
  createdById: string;
  expiresInDays?: number;
}): Promise<{
  invite: {
    id: string;
    createdById: string;
    expiresAt: Date | null;
    createdAt: Date;
  };
  rawCode: string;
}> {
  const parsed = createInviteSchema.safeParse({ expiresInDays: params.expiresInDays });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid invitation expiration");
  }

  const days = parsed.data.expiresInDays ?? DEFAULT_INVITE_EXPIRATION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const rawCode = generateInviteCode();
  const codeHash = hashInviteCode(rawCode);

  const invite = await db.inviteCode.create({
    data: {
      codeHash,
      createdById: params.createdById,
      expiresAt,
    },
    select: {
      id: true,
      createdById: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return {
    invite,
    rawCode,
  };
}
