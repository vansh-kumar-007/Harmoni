import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import {
  hashSessionToken,
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  toSafeUser,
  SESSION_MAX_AGE_MS,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import db from "@/lib/db";

const { Pool } = pg;

describe("Database-Backed Session Engine", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();
  });

  afterAll(async () => {
    // Exact-ID cleanup of test records (zero wildcards)
    if (client) {
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
      }
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  it("exports appropriate session constants", () => {
    expect(SESSION_MAX_AGE_MS).toBe(30 * 24 * 60 * 60 * 1000); // 30 days
    expect(SESSION_COOKIE_NAME).toBe("harmoni_session");
  });

  it("correctly strips sensitive fields via toSafeUser", () => {
    const rawDbUser = {
      id: "u_test_1",
      username: "alice",
      displayName: "Alice",
      avatarKey: "avatar_1",
      bio: "Hello world",
      role: "USER" as const,
      passwordHash: "$argon2id$v=19$m=19456...SUPER_SECRET",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const safe = toSafeUser(rawDbUser);
    expect(safe).not.toHaveProperty("passwordHash");
    expect((safe as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    expect(safe.username).toBe("alice");
    expect(safe.role).toBe("USER");
  });

  it("hashes raw tokens using SHA-256", () => {
    const token = "a".repeat(64);
    const hash = hashSessionToken(token);
    expect(hash).toHaveLength(64);
    expect(hash).toBe(crypto.createHash("sha256").update(token).digest("hex"));
  });

  it("creates a valid session in PostgreSQL and never stores raw tokens", async () => {
    // Create temporary test user
    const userId = `u_sess_${runSlug}_1`;
    const username = `alice_${runSlug}_1`;
    const passwordHash = await hashPassword("TestPassword_123!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Alice Session Tester', $3, 'USER', NOW());
      `,
      [userId, username, passwordHash]
    );
    createdUserIds.push(userId);

    // Call actual source createSession function
    const { session, rawToken } = await createSession(userId);

    expect(rawToken).toHaveLength(64); // 32 bytes hex
    expect(session.userId).toBe(userId);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Verify raw token is NOT in database
    const rawCheck = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [rawToken]
    );
    expect(rawCheck.rows.length).toBe(0);

    // Verify hashed token IS in database
    const expectedHash = hashSessionToken(rawToken);
    const hashCheck = await client.query(
      `SELECT "id", "userId" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [expectedHash]
    );
    expect(hashCheck.rows.length).toBe(1);
    expect(hashCheck.rows[0].userId).toBe(userId);
  });

  it("validates active session and returns SafeUser without passwordHash", async () => {
    const userId = `u_sess_${runSlug}_2`;
    const username = `bob_${runSlug}_2`;
    const passwordHash = await hashPassword("TestPassword_456!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Bob Session Tester', $3, 'USER', NOW());
      `,
      [userId, username, passwordHash]
    );
    createdUserIds.push(userId);

    const { rawToken, session: created } = await createSession(userId);

    // Call actual source validateSession function
    const validated = await validateSession(rawToken);

    expect(validated).not.toBeNull();
    expect(validated!.user.id).toBe(userId);
    expect(validated!.user.username).toBe(username);
    expect((validated!.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();

    // Verify fixed 30-day expiration: validateSession does NOT modify expiresAt
    expect(validated!.session.expiresAt.toISOString()).toBe(created.expiresAt.toISOString());
  });

  it("rejects invalid, malformed, or nonexistent tokens", async () => {
    expect(await validateSession("")).toBeNull();
    expect(await validateSession("short")).toBeNull();
    expect(await validateSession(crypto.randomBytes(32).toString("hex"))).toBeNull();
  });

  it("rejects and purges expired sessions", async () => {
    const userId = `u_sess_${runSlug}_3`;
    const username = `charlie_${runSlug}_3`;
    const passwordHash = await hashPassword("TestPassword_789!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Charlie Session Tester', $3, 'USER', NOW());
      `,
      [userId, username, passwordHash]
    );
    createdUserIds.push(userId);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const sessionTokenHash = hashSessionToken(rawToken);
    const expiredSessionId = `s_exp_${runSlug}_3`;
    const pastDate = new Date(Date.now() - 3600000);

    // Insert pre-expired session in DB via Prisma
    await db.session.create({
      data: {
        id: expiredSessionId,
        sessionTokenHash,
        userId,
        expiresAt: pastDate,
      },
    });

    // Call actual source validateSession function
    const validated = await validateSession(rawToken);
    expect(validated).toBeNull();

    // Verify expired session was purged from PostgreSQL
    const checkDb = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [sessionTokenHash]
    );
    expect(checkDb.rows.length).toBe(0);
  });

  it("revokes active session via revokeSession", async () => {
    const userId = `u_sess_${runSlug}_4`;
    const username = `dana_${runSlug}_4`;
    const passwordHash = await hashPassword("TestPassword_Dana!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Dana Session Tester', $3, 'USER', NOW());
      `,
      [userId, username, passwordHash]
    );
    createdUserIds.push(userId);

    const { rawToken } = await createSession(userId);

    // Active session validates
    expect(await validateSession(rawToken)).not.toBeNull();

    // Revoke using actual source revokeSession function
    const revoked = await revokeSession(rawToken);
    expect(revoked).toBe(true);

    // After revocation, validation returns null
    expect(await validateSession(rawToken)).toBeNull();
  });

  it("revokes all sessions for a user via revokeAllUserSessions", async () => {
    const userId = `u_sess_${runSlug}_5`;
    const username = `evan_${runSlug}_5`;
    const passwordHash = await hashPassword("TestPassword_Evan!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Evan Session Tester', $3, 'USER', NOW());
      `,
      [userId, username, passwordHash]
    );
    createdUserIds.push(userId);

    const s1 = await createSession(userId);
    const s2 = await createSession(userId);
    const s3 = await createSession(userId);

    expect(await validateSession(s1.rawToken)).not.toBeNull();
    expect(await validateSession(s2.rawToken)).not.toBeNull();
    expect(await validateSession(s3.rawToken)).not.toBeNull();

    // Revoke all sessions for this user
    const count = await revokeAllUserSessions(userId);
    expect(count).toBe(3);

    expect(await validateSession(s1.rawToken)).toBeNull();
    expect(await validateSession(s2.rawToken)).toBeNull();
    expect(await validateSession(s3.rawToken)).toBeNull();
  });
});
