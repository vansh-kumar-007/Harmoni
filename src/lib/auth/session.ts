import "server-only";
import crypto from "node:crypto";
import db from "@/lib/db";

/**
 * Session Expiration Configuration:
 * - Fixed 30-day session lifetime from creation.
 * - Cookie expiration matches database expiration exactly.
 */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_COOKIE_NAME = "harmoni_session";

/**
 * Sanitized user representation for safe client-side propagation.
 * Omits sensitive cryptographic data such as passwordHash.
 */
export interface SafeUser {
  id: string;
  username: string;
  displayName: string;
  avatarKey: string;
  bio: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Strips passwordHash and internal secrets from a database user record.
 */
export function toSafeUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarKey: string;
  bio: string | null;
  role: "USER" | "ADMIN";
  createdAt: Date;
  updatedAt: Date;
}): SafeUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarKey: user.avatarKey,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Generates a SHA-256 digest of a raw session token.
 * Only the digest is persisted in PostgreSQL to protect against database dump leaks.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type TransactionClient = Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Creates a cryptographically secure random session in PostgreSQL.
 * Supports running within an existing Prisma transaction client or the singleton db client.
 *
 * @param userId ID of the authenticated user
 * @param tx Optional Prisma transaction client
 * @returns Object containing the created session metadata and the raw bearer token (to be sent via cookie)
 */
export async function createSession(
  userId: string,
  tx?: TransactionClient
): Promise<{
  session: { id: string; userId: string; expiresAt: Date; createdAt: Date };
  rawToken: string;
}> {
  const client = tx ?? db;
  // Generate 256 bits (32 bytes) of cryptographically secure random entropy
  const rawToken = crypto.randomBytes(32).toString("hex");
  const sessionTokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);

  const session = await client.session.create({
    data: {
      sessionTokenHash,
      userId,
      expiresAt,
    },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return { session, rawToken };
}

/**
 * Validates a raw bearer token against PostgreSQL sessions.
 * Checks for existence, user status, and expiration.
 *
 * @param rawToken The raw token obtained from the HTTP-only session cookie
 * @returns The session and SafeUser, or null if invalid or expired
 */
export async function validateSession(rawToken: string): Promise<{
  session: { id: string; userId: string; expiresAt: Date; createdAt: Date };
  user: SafeUser;
} | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length < 32) {
    return null;
  }

  const sessionTokenHash = hashSessionToken(rawToken);

  const found = await db.session.findUnique({
    where: { sessionTokenHash },
    include: {
      user: true,
    },
  });

  if (!found || !found.user) {
    return null;
  }

  const expiresAtTime = new Date(found.expiresAt).getTime();

  // Expired session handling: clean up and reject
  if (isNaN(expiresAtTime) || expiresAtTime <= Date.now()) {
    await db.session.delete({
      where: { id: found.id },
    }).catch(() => {
      // Ignore if already deleted concurrently
    });
    return null;
  }

  return {
    session: {
      id: found.id,
      userId: found.userId,
      expiresAt: new Date(found.expiresAt),
      createdAt: new Date(found.createdAt),
    },
    user: toSafeUser(found.user),
  };
}

/**
 * Revokes an active session by its raw bearer token.
 *
 * @param rawToken Raw session token to invalidate
 * @returns true if deleted, false otherwise
 */
export async function revokeSession(rawToken: string): Promise<boolean> {
  if (!rawToken) {
    return false;
  }
  const sessionTokenHash = hashSessionToken(rawToken);
  const result = await db.session.deleteMany({
    where: { sessionTokenHash },
  });
  return result.count > 0;
}

/**
 * Revokes all active sessions for a user (useful for password resets or security wipe).
 *
 * @param userId ID of the user whose sessions should be cleared
 * @returns Number of sessions revoked
 */
export async function revokeAllUserSessions(userId: string): Promise<number> {
  const result = await db.session.deleteMany({
    where: { userId },
  });
  return result.count;
}
