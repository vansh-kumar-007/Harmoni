import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { registerUser, RegistrationError } from "@/lib/auth/register";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { createInviteCode, hashInviteCode } from "@/lib/auth/invites";
import { hashPassword } from "@/lib/auth/password";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

const { Pool } = pg;

// Mock next/headers cookie store for authentication context
let currentCookieJar: Record<string, string> = {};
let cookieSetHistory: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];

const mockCookieSet = vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
  currentCookieJar[name] = value;
  cookieSetHistory.push({ name, value, options });
});
const mockCookieDelete = vi.fn((name: string) => {
  delete currentCookieJar[name];
});

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = currentCookieJar[name];
      return val ? { name, value: val } : undefined;
    },
    set: mockCookieSet,
    delete: mockCookieDelete,
  }),
}));

describe("Atomic Registration Service & Route Handler", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];
  const createdInviteIds: string[] = [];

  let adminUserId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    // Create a temporary admin to issue test invitations
    adminUserId = `u_adm_reg_${runSlug}`;
    const adminUsername = `admin_reg_${runSlug}`;
    const adminPassHash = await hashPassword("AdminPass_1234!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Admin Register Tester', $3, 'ADMIN', NOW());
      `,
      [adminUserId, adminUsername, adminPassHash]
    );
    createdUserIds.push(adminUserId);
  });

  beforeEach(() => {
    currentCookieJar = {};
    cookieSetHistory = [];
    vi.clearAllMocks();
  });

  afterAll(async () => {
    if (client) {
      if (createdInviteIds.length > 0) {
        await client.query(`DELETE FROM "InviteCode" WHERE "id" = ANY($1::text[]);`, [createdInviteIds]);
      }
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[]);`, [createdUserIds]);
      }
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe("registerUser Service", () => {
    it("successfully registers a user, consumes invite, and creates session atomically", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      const username = `reg_${runSlug}_1`;
      const result = await registerUser({
        inviteCode: rawCode,
        username,
        displayName: "Registered User 1",
        password: "ValidPassword123!",
      });

      createdUserIds.push(result.user.id);

      // Verify returned SafeUser
      expect(result.user.username).toBe(username);
      expect(result.user.displayName).toBe("Registered User 1");
      expect(result.user.role).toBe("USER");
      expect((result.user as unknown as Record<string, unknown>).passwordHash).toBeUndefined();

      // Verify session was created in PostgreSQL with SHA-256 hash
      expect(result.session).toBeDefined();
      expect(result.rawToken).toBeDefined();

      const sessionDb = await client.query(
        `SELECT "id", "userId", "sessionTokenHash" FROM "Session" WHERE "id" = $1;`,
        [result.session.id]
      );
      expect(sessionDb.rows.length).toBe(1);
      expect(sessionDb.rows[0].userId).toBe(result.user.id);
      expect(sessionDb.rows[0].sessionTokenHash).not.toBe(result.rawToken);

      // Verify invitation is marked redeemed by this user in PostgreSQL
      const inviteDb = await client.query(
        `SELECT "id", "usedById" FROM "InviteCode" WHERE "id" = $1;`,
        [invite.id]
      );
      expect(inviteDb.rows[0].usedById).toBe(result.user.id);
    });

    it("rejects invalid invitation code and leaves no user behind (transaction rollback)", async () => {
      const fakeInviteCode = "0000000000000000000000000000000000000000000000000000000000000000";
      const username = `reg_fail_${runSlug}`;

      await expect(
        registerUser({
          inviteCode: fakeInviteCode,
          username,
          displayName: "Should Rollback",
          password: "ValidPassword123!",
        })
      ).rejects.toThrow(RegistrationError);

      // Verify in PostgreSQL that the user was NOT created
      const userDb = await client.query(
        `SELECT "id" FROM "User" WHERE "username" = $1;`,
        [username]
      );
      expect(userDb.rows.length).toBe(0);
    });

    it("rejects expired invitation code and leaves no user behind", async () => {
      // Create an expired invitation directly in PostgreSQL
      const expiredInviteId = `inv_exp_${runSlug}`;
      const rawCode = crypto.randomBytes(32).toString("hex");
      const codeHash = hashInviteCode(rawCode);

      await client.query(
        `
        INSERT INTO "InviteCode" ("id", "codeHash", "createdById", "expiresAt", "createdAt")
        VALUES ($1, $2, $3, NOW() - INTERVAL '1 day', NOW());
        `,
        [expiredInviteId, codeHash, adminUserId]
      );
      createdInviteIds.push(expiredInviteId);

      const username = `reg_exp_${runSlug}`;

      await expect(
        registerUser({
          inviteCode: rawCode,
          username,
          displayName: "Expired Tester",
          password: "ValidPassword123!",
        })
      ).rejects.toThrow(RegistrationError);

      // Verify user was not created
      const userDb = await client.query(
        `SELECT "id" FROM "User" WHERE "username" = $1;`,
        [username]
      );
      expect(userDb.rows.length).toBe(0);

      // Verify invite was NOT redeemed
      const inviteDb = await client.query(
        `SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`,
        [expiredInviteId]
      );
      expect(inviteDb.rows[0].usedById).toBeNull();
    });

    it("rejects already-redeemed invitation code", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      // 1. First redemption succeeds
      const username1 = `reg_first_${runSlug}`;
      const res1 = await registerUser({
        inviteCode: rawCode,
        username: username1,
        displayName: "First User",
        password: "ValidPassword123!",
      });
      createdUserIds.push(res1.user.id);

      // 2. Second redemption attempt with same code must be rejected
      const username2 = `reg_second_${runSlug}`;
      await expect(
        registerUser({
          inviteCode: rawCode,
          username: username2,
          displayName: "Second User",
          password: "ValidPassword123!",
        })
      ).rejects.toThrow(RegistrationError);

      // Verify second user was not created
      const user2Db = await client.query(
        `SELECT "id" FROM "User" WHERE "username" = $1;`,
        [username2]
      );
      expect(user2Db.rows.length).toBe(0);
    });

    it("rejects duplicate username without consuming the invitation", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      // Attempt registration with admin's existing username
      const existingAdminUsername = `admin_reg_${runSlug}`;

      await expect(
        registerUser({
          inviteCode: rawCode,
          username: existingAdminUsername,
          displayName: "Duplicate Attempter",
          password: "ValidPassword123!",
        })
      ).rejects.toThrow(RegistrationError);

      // Verify invitation was NOT consumed
      const inviteDb = await client.query(
        `SELECT "usedById" FROM "InviteCode" WHERE "id" = $1;`,
        [invite.id]
      );
      expect(inviteDb.rows[0].usedById).toBeNull();
    });

    it("serializes concurrent registrations on the same invitation: exactly one succeeds", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      const usernameRace1 = `race1_${runSlug}`;
      const usernameRace2 = `race2_${runSlug}`;

      // Run both registration promises simultaneously
      const p1 = registerUser({
        inviteCode: rawCode,
        username: usernameRace1,
        displayName: "Racer 1",
        password: "ValidPassword123!",
      }).then((res) => ({ status: "fulfilled" as const, res }))
        .catch((err) => ({ status: "rejected" as const, err }));

      const p2 = registerUser({
        inviteCode: rawCode,
        username: usernameRace2,
        displayName: "Racer 2",
        password: "ValidPassword123!",
      }).then((res) => ({ status: "fulfilled" as const, res }))
        .catch((err) => ({ status: "rejected" as const, err }));

      const [res1, res2] = await Promise.all([p1, p2]);

      const successes = [res1, res2].filter((r) => r.status === "fulfilled");
      const failures = [res1, res2].filter((r) => r.status === "rejected");

      expect(successes.length).toBe(1);
      expect(failures.length).toBe(1);

      if (successes[0].status === "fulfilled") {
        createdUserIds.push(successes[0].res.user.id);
      }

      // Check failure was an INVALID_INVITE error
      if (failures[0].status === "rejected") {
        expect(failures[0].err).toBeInstanceOf(RegistrationError);
        expect((failures[0].err as RegistrationError).code).toBe("INVALID_INVITE");
      }

      // Verify in DB that only the winning user was created
      const checkUsers = await client.query(
        `SELECT "username" FROM "User" WHERE "username" IN ($1, $2);`,
        [usernameRace1, usernameRace2]
      );
      expect(checkUsers.rows.length).toBe(1);
    });
  });

  describe("POST /api/auth/register Route Handler", () => {
    it("successfully registers via HTTP request and sets session cookie", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      const username = `http_reg_${runSlug}`;
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: rawCode,
          username,
          displayName: "HTTP Reg User",
          password: "ValidPassword123!",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(201);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.username).toBe(username);
      expect(data.user.passwordHash).toBeUndefined();
      createdUserIds.push(data.user.id);

      // Verify cookie was set
      expect(mockCookieSet).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        })
      );
    });

    it("rejects non-JSON requests with 415 Unsupported Media Type", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "raw string",
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(415);

      const data = await res.json();
      expect(data.error).toContain("application/json is required");
    });

    it("rejects malformed JSON with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ bad json",
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Malformed JSON");
    });

    it("rejects invalid input schema (short password) with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: "abc123def456_too_short",
          username: "validuser",
          displayName: "Valid Name",
          password: "123", // Too short
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("at least 8 characters");
    });

    it("returns 409 Conflict when username is already taken", async () => {
      const { invite, rawCode } = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(invite.id);

      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode: rawCode,
          username: `admin_reg_${runSlug}`, // existing admin username
          displayName: "Duplicate User",
          password: "ValidPassword123!",
        }),
      });

      const res = await registerRoute(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toContain("Username is already taken");
    });
  });
});
