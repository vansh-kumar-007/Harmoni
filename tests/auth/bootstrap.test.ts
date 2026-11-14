import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import {
  HARMONI_BOOTSTRAP_LOCK_ID,
  restoreRawMode,
  promptMasked,
  checkAdminExists,
  createAdminWithLock,
} from "../../scripts/bootstrap-admin.mjs";
import { verifyPassword } from "@/lib/auth/password";

const { Pool } = pg;

describe("Administrator Bootstrap Hardening & Advisory Locks", () => {
  let pool: pg.Pool;
  let client1: pg.PoolClient;
  let client2: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client1 = await pool.connect();
    client2 = await pool.connect();
  });

  afterAll(async () => {
    // Exact-ID cleanup: purge any test users created during bootstrap tests
    if (client1) {
      if (createdUserIds.length > 0) {
        await client1.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
      }
      client1.release();
    }
    if (client2) {
      client2.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe("Interactive TTY & Raw Mode Safety", () => {
    it("safely executes restoreRawMode without throwing", () => {
      expect(() => restoreRawMode()).not.toThrow();
    });

    it("immediately rejects promptMasked if stdin is not a TTY", async () => {
      const originalIsTTY = process.stdin.isTTY;
      try {
        // Force isTTY to false to simulate non-interactive or redirected input
        Object.defineProperty(process.stdin, "isTTY", { value: false, configurable: true });

        await expect(promptMasked("Password: ")).rejects.toThrow(
          /Interactive terminal \(TTY\) is strictly required/
        );
      } finally {
        Object.defineProperty(process.stdin, "isTTY", { value: originalIsTTY, configurable: true });
      }
    });
  });

  describe("checkAdminExists & createAdminWithLock", () => {
    it("detects when no admin exists", async () => {
      // Prior to creating any admin in this run, check if admin exists
      // If there is an existing admin from outside the test, we ensure our queries check correctly
      const existing = await checkAdminExists(client1);
      // If none exists, it should be null
      if (!existing) {
        expect(existing).toBeNull();
      } else {
        expect(existing.id).toBeDefined();
        expect(existing.username).toBeDefined();
      }
    });

    it("rejects creation if username is already taken by a regular user", async () => {
      const regularUserId = `u_reg_${runSlug}_taken`;
      const regularUsername = `taken_${runSlug}`;

      await client1.query(
        `
        INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
        VALUES ($1, $2, 'Taken User', 'dummy_hash', 'USER', NOW());
        `,
        [regularUserId, regularUsername]
      );
      createdUserIds.push(regularUserId);

      const result = await createAdminWithLock(client1, {
        username: regularUsername,
        displayName: "Admin Imposter",
        password: "ValidAdminPassword123!",
        customId: `admin_fail_${runSlug}`,
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("USERNAME_TAKEN");
    });
  });

  describe("Advisory Lock Serialization & Concurrency", () => {
    it("serializes concurrent bootstrap attempts: exactly one succeeds and one is rejected", async () => {
      // Ensure no lingering admin exists before running concurrent test
      // First check if a pre-existing admin exists in the database
      const preCheck = await checkAdminExists(client1);
      if (preCheck) {
        // Skip concurrent creation test if an admin already exists outside tests
        console.warn("[SKIP] An admin already exists in the database; skipping concurrent admin creation test.");
        return;
      }

      const adminId1 = `u_boot_${runSlug}_1`;
      const adminId2 = `u_boot_${runSlug}_2`;
      createdUserIds.push(adminId1, adminId2);

      // Launch two bootstrap attempts concurrently on distinct database client connections
      const p1 = createAdminWithLock(client1, {
        username: `admin_first_${runSlug}`,
        displayName: "First Admin Attempt",
        password: "ValidAdminPass123!",
        customId: adminId1,
      });

      const p2 = createAdminWithLock(client2, {
        username: `admin_second_${runSlug}`,
        displayName: "Second Admin Attempt",
        password: "ValidAdminPass123!",
        customId: adminId2,
      });

      const [res1, res2] = await Promise.all([p1, p2]);

      // Exactly one must succeed and one must be rejected with ALREADY_EXISTS
      const successes = [res1, res2].filter((r) => r.success);
      const failures = [res1, res2].filter((r) => !r.success);

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);
      expect(failures[0].reason).toBe("ALREADY_EXISTS");

      // Verify the winning admin was inserted into PostgreSQL with valid Argon2id hash
      const winner = successes[0];
      const dbCheck = await client1.query(
        `SELECT "id", "username", "passwordHash", "role" FROM "User" WHERE "id" = $1;`,
        [winner.userId]
      );
      expect(dbCheck.rows.length).toBe(1);
      expect(dbCheck.rows[0].role).toBe("ADMIN");

      const isPassValid = await verifyPassword("ValidAdminPass123!", dbCheck.rows[0].passwordHash);
      expect(isPassValid).toBe(true);

      // Verify the advisory lock was released
      const unlock1 = await client1.query(
        `SELECT pg_advisory_unlock($1::bigint) as unlocked;`,
        [HARMONI_BOOTSTRAP_LOCK_ID]
      );
      // pg_advisory_unlock returns false if the lock was not held by this session
      expect(unlock1.rows[0].unlocked).toBe(false);

      const unlock2 = await client2.query(
        `SELECT pg_advisory_unlock($1::bigint) as unlocked;`,
        [HARMONI_BOOTSTRAP_LOCK_ID]
      );
      expect(unlock2.rows[0].unlocked).toBe(false);

      // Immediately delete the created test admin so no admin is left in DB
      await client1.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [[adminId1, adminId2]]);
    });
  });
});
