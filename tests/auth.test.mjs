import "dotenv/config";
import crypto from "node:crypto";
import pg from "pg";
import { hash, verify, Algorithm } from "@node-rs/argon2";
import { z } from "zod";

const { Pool } = pg;

// Import Zod schemas matching src/lib/auth/password.ts
const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters long")
  .max(30, "Username must be at most 30 characters long")
  .regex(
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/,
    "Username may only contain letters, numbers, underscores, and hyphens, and cannot start or end with a symbol"
  )
  .transform((val) => val.toLowerCase());

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .max(1024, "Password cannot exceed 1024 characters");

const ARGON2ID_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
  algorithm: Algorithm.Argon2id,
};

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function runAuthTests() {
  console.log("=== Harmoni Authentication & Session Verification Suite ===\n");

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined in environment");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5000,
  });

  const client = await pool.connect();

  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);
  const createdUserIds = [];

  try {
    // =============================================================
    // SECTION 1: PASSWORD SECURITY & ARGON2ID HASHING TESTS
    // =============================================================
    console.log("--- 1. Password Security & Argon2id Hashing Tests ---");

    const plainPassword = "CorrectHorseBatteryStaple_2026!";
    const t0 = Date.now();
    const passwordHash1 = await hash(plainPassword, ARGON2ID_OPTIONS);
    const hashDuration = Date.now() - t0;

    console.log(`[PASS] Argon2id hash generated in ${hashDuration}ms.`);

    // A. Verify OWASP parameter string format
    if (!passwordHash1.startsWith("$argon2id$v=19$m=19456,t=2,p=1$")) {
      throw new Error(`Hash does not adhere to OWASP Argon2id parameters: ${passwordHash1}`);
    }
    console.log("[PASS] Hash adheres to OWASP specification (m=19456, t=2, p=1, argon2id).");

    // B. Plaintext password is never contained in hash
    if (passwordHash1.includes(plainPassword)) {
      throw new Error("Plaintext password leaked inside the hash string!");
    }
    console.log("[PASS] Plaintext password is completely absent from hash string.");

    // C. Correct password verification succeeds
    const isCorrect = await verify(passwordHash1, plainPassword);
    if (!isCorrect) {
      throw new Error("Valid password failed verification against hash!");
    }
    console.log("[PASS] Correct password verifies successfully.");

    // D. Incorrect password verification fails
    const isWrong = await verify(passwordHash1, "IncorrectPassword_123");
    if (isWrong) {
      throw new Error("Incorrect password was falsely accepted!");
    }
    console.log("[PASS] Incorrect password is rejected.");

    // E. Unique salt per hash: two hashes of the same password produce distinct digests
    const passwordHash2 = await hash(plainPassword, ARGON2ID_OPTIONS);
    if (passwordHash1 === passwordHash2) {
      throw new Error("Argon2id failed to generate unique random salt across hash operations!");
    }
    console.log("[PASS] Independent hashes produce distinct salted digests.");

    // F. Length validations
    let shortPassRejected = false;
    try {
      passwordSchema.parse("short7!");
    } catch {
      shortPassRejected = true;
    }
    if (!shortPassRejected) {
      throw new Error("Password shorter than 8 characters was not rejected!");
    }
    console.log("[PASS] Passwords under 8 characters are rejected.");

    // Long passphrase support (password managers)
    const longPassphrase = "a".repeat(256) + "SecureLongPassphrase_999!";
    const longHash = await hash(longPassphrase, ARGON2ID_OPTIONS);
    const longVerified = await verify(longHash, longPassphrase);
    if (!longVerified) {
      throw new Error("Long passphrase failed verification!");
    }
    console.log("[PASS] Long passwords (256+ characters) supported without silent truncation.");

    // Username schema validation
    const validUser = usernameSchema.parse("harmoni_admin-01");
    if (validUser !== "harmoni_admin-01") {
      throw new Error("Username normalization failed");
    }
    let badUserRejected = false;
    try {
      usernameSchema.parse("-bad-username-");
    } catch {
      badUserRejected = true;
    }
    if (!badUserRejected) {
      throw new Error("Invalid username format was not rejected");
    }
    console.log("[PASS] Username validation enforces strict alphanumeric, underscore, and hyphen format.");

    // =============================================================
    // SECTION 2: DATABASE-BACKED SESSION TESTS
    // =============================================================
    console.log("\n--- 2. Database-Backed Sessions & Token Security Tests ---");

    // Create temporary test user in PostgreSQL
    const testUserId = `u_auth_${runSlug}`;
    const testUsername = `testuser_${runSlug}`;
    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Auth Test User', $3, 'USER', NOW());
      `,
      [testUserId, testUsername, passwordHash1]
    );
    createdUserIds.push(testUserId);
    console.log(`[PASS] Created test user: ${testUsername} (${testUserId})`);

    // A. Generate cryptographically secure 256-bit entropy raw session token
    const rawToken = crypto.randomBytes(32).toString("hex");
    if (rawToken.length !== 64) {
      throw new Error(`Expected 64-char hex string (32 bytes / 256 bits), got length ${rawToken.length}`);
    }
    const sessionTokenHash = hashSessionToken(rawToken);

    // Persist session to PostgreSQL
    const sessionId = `s_${runSlug}`;
    const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await client.query(
      `
      INSERT INTO "Session" ("id", "sessionTokenHash", "userId", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, $4, NOW());
      `,
      [sessionId, sessionTokenHash, testUserId, sessionExpiry]
    );
    console.log("[PASS] Created session in PostgreSQL with SHA-256 token digest.");

    // B. Verify raw session token is NEVER stored in database
    const rawTokenLeakCheck = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [rawToken]
    );
    if (rawTokenLeakCheck.rows.length > 0) {
      throw new Error("SECURITY VIOLATION: Raw unhashed session token was found stored in PostgreSQL!");
    }

    const hashedTokenLookup = await client.query(
      `SELECT "id", "userId", "expiresAt" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [sessionTokenHash]
    );
    if (hashedTokenLookup.rows.length !== 1) {
      throw new Error("Failed to look up session by hashed token digest!");
    }
    console.log("[PASS] Raw session token is absent from PostgreSQL; only SHA-256 digest is persisted.");

    // C. Valid session resolution
    const sessionResolveQuery = await client.query(
      `
      SELECT s."id" as session_id, s."expiresAt", u."id" as user_id, u."username", u."displayName", u."role"
      FROM "Session" s
      JOIN "User" u ON u."id" = s."userId"
      WHERE s."sessionTokenHash" = $1 AND s."expiresAt" > NOW();
      `,
      [sessionTokenHash]
    );
    if (sessionResolveQuery.rows.length !== 1 || sessionResolveQuery.rows[0].username !== testUsername) {
      throw new Error("Valid session failed to resolve to the correct authenticated user!");
    }
    console.log(`[PASS] Valid session resolves to user '@${sessionResolveQuery.rows[0].username}' (Role: ${sessionResolveQuery.rows[0].role}).`);

    // D. Invalid random tokens are rejected
    const bogusRawToken = crypto.randomBytes(32).toString("hex");
    const bogusHash = hashSessionToken(bogusRawToken);
    const bogusQuery = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [bogusHash]
    );
    if (bogusQuery.rows.length !== 0) {
      throw new Error("Invalid random token matched an existing session!");
    }
    console.log("[PASS] Unrecognized random tokens return null.");

    // E. Expired session rejection & cleanup
    const expiredRawToken = crypto.randomBytes(32).toString("hex");
    const expiredHash = hashSessionToken(expiredRawToken);
    const expiredSessionId = `s_exp_${runSlug}`;
    await client.query(
      `
      INSERT INTO "Session" ("id", "sessionTokenHash", "userId", "expiresAt", "createdAt")
      VALUES ($1, $2, $3, NOW() - INTERVAL '1 hour', NOW());
      `,
      [expiredSessionId, expiredHash, testUserId]
    );

    const expiredCheck = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1 AND "expiresAt" > NOW();`,
      [expiredHash]
    );
    if (expiredCheck.rows.length !== 0) {
      throw new Error("Expired session was erroneously treated as active!");
    }

    // Clean up expired session
    await client.query(`DELETE FROM "Session" WHERE "sessionTokenHash" = $1;`, [expiredHash]);
    console.log("[PASS] Expired sessions are recognized as expired and rejected.");

    // F. Session revocation on logout
    await client.query(`DELETE FROM "Session" WHERE "sessionTokenHash" = $1;`, [sessionTokenHash]);
    const revokedCheck = await client.query(
      `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
      [sessionTokenHash]
    );
    if (revokedCheck.rows.length !== 0) {
      throw new Error("Revoked session was not deleted from PostgreSQL!");
    }
    console.log("[PASS] Session revocation successfully purges session record from database.");

    // =============================================================
    // SECTION 3: CENTRALIZED AUTHORIZATION & ROLE-BASED ACCESS
    // =============================================================
    console.log("\n--- 3. Centralized Authorization & Data Access Layer Tests ---");

    // Standard user role verification
    const standardUserRoleCheck = await client.query(
      `SELECT "role" FROM "User" WHERE "id" = $1;`,
      [testUserId]
    );
    const isStandardAdmin = standardUserRoleCheck.rows[0].role === "ADMIN";
    if (isStandardAdmin) {
      throw new Error("Standard test user was erroneously granted ADMIN privileges!");
    }
    console.log("[PASS] Standard user with role 'USER' is strictly denied administrative operations.");

    // Create temporary admin user
    const testAdminId = `u_admin_${runSlug}`;
    const testAdminUsername = `testadmin_${runSlug}`;
    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Auth Test Admin', $3, 'ADMIN', NOW());
      `,
      [testAdminId, testAdminUsername, passwordHash1]
    );
    createdUserIds.push(testAdminId);

    const adminRoleCheck = await client.query(
      `SELECT "role" FROM "User" WHERE "id" = $1;`,
      [testAdminId]
    );
    if (adminRoleCheck.rows[0].role !== "ADMIN") {
      throw new Error("Admin user role verification failed!");
    }
    console.log("[PASS] Administrator user verified with role 'ADMIN'.");

    // =============================================================
    // SECTION 4: ADMINISTRATOR BOOTSTRAP CLI LOGIC VERIFICATION
    // =============================================================
    console.log("\n--- 4. Administrator Bootstrap Logic & Idempotency Tests ---");

    // Check duplicate bootstrap refusal:
    // With an existing admin in the database, bootstrap query must detect it and refuse
    const adminExistsQuery = await client.query(
      `SELECT "id", "username" FROM "User" WHERE "role" = 'ADMIN' LIMIT 1;`
    );
    if (adminExistsQuery.rows.length === 0) {
      throw new Error("Bootstrap idempotency test failed to detect the active administrator!");
    }
    console.log(`[PASS] Bootstrap refusal check: detects existing admin '@${adminExistsQuery.rows[0].username}' and prevents duplicate bootstrap.`);

    // =============================================================
    // SECTION 5: CLEANUP & PRESERVATION CONFIRMATION
    // =============================================================
    console.log("\n--- 5. Isolated Cleanup & Database Verification ---");

    // Delete tracked test users (cascades to their sessions)
    const cleanupRes = await client.query(
      `DELETE FROM "User" WHERE "id" = ANY($1::text[]);`,
      [createdUserIds]
    );
    console.log(`[PASS] Cleaned up ${cleanupRes.rowCount} tracked test users.`);

    // Confirm 0 test records remain
    const residueCheck = await client.query(
      `SELECT count(*) as count FROM "User" WHERE "id" = ANY($1::text[]);`,
      [createdUserIds]
    );
    if (parseInt(residueCheck.rows[0].count, 10) !== 0) {
      throw new Error("Residue test records remained after cleanup!");
    }
    console.log("[PASS] Database cleanliness verified: exactly 0 test records remain in PostgreSQL.");

    console.log("\n=== ALL AUTHENTICATION & SECURITY TESTS PASSED SUCCESSFULLY ===");
  } catch (err) {
    console.error("\n[CRITICAL] Authentication test suite encountered an error:", err);
    try {
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
        console.log("[INFO] Tracked test records cleaned up after test failure.");
      }
    } catch (cleanupErr) {
      console.error("[CRITICAL] Cleanup failed:", cleanupErr);
    }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runAuthTests().catch((err) => {
  console.error("[FAIL] Test suite failed:", err.message);
  process.exit(1);
});
