import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import {
  hashInviteCode,
  generateInviteCode,
  createInviteCode,
  DEFAULT_INVITE_EXPIRATION_DAYS,
} from "@/lib/auth/invites";
import { POST as createInviteRoute } from "@/app/api/admin/invites/route";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

const { Pool } = pg;

// Mock next/headers cookie store for authentication context
let currentCookieJar: Record<string, string> = {};
const mockCookieSet = vi.fn((name: string, value: string) => {
  currentCookieJar[name] = value;
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

describe("Administrator Invitation Engine & API", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];
  const createdInviteIds: string[] = [];

  let adminUserId: string;
  let adminToken: string;

  let regularUserId: string;
  let regularToken: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    // 1. Create temporary test admin
    adminUserId = `u_adm_inv_${runSlug}`;
    const adminUsername = `admin_inv_${runSlug}`;
    const adminPassHash = await hashPassword("AdminPass_1234!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Admin Tester', $3, 'ADMIN', NOW());
      `,
      [adminUserId, adminUsername, adminPassHash]
    );
    createdUserIds.push(adminUserId);

    const adminSession = await createSession(adminUserId);
    adminToken = adminSession.rawToken;

    // 2. Create temporary test standard user
    regularUserId = `u_reg_inv_${runSlug}`;
    const regularUsername = `user_inv_${runSlug}`;
    const regularPassHash = await hashPassword("RegularPass_1234!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Regular Tester', $3, 'USER', NOW());
      `,
      [regularUserId, regularUsername, regularPassHash]
    );
    createdUserIds.push(regularUserId);

    const regularSession = await createSession(regularUserId);
    regularToken = regularSession.rawToken;
  });

  beforeEach(() => {
    currentCookieJar = {};
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

  describe("Cryptographic Helpers", () => {
    it("generates 256 bits (64 hex characters) of entropy", () => {
      const code1 = generateInviteCode();
      const code2 = generateInviteCode();
      expect(code1).toMatch(/^[a-f0-9]{64}$/);
      expect(code2).toMatch(/^[a-f0-9]{64}$/);
      expect(code1).not.toBe(code2);
    });

    it("deterministically computes SHA-256 digest of invite code", () => {
      const raw = "abc123def456_test_invite_code";
      const expected = crypto.createHash("sha256").update(raw).digest("hex");
      expect(hashInviteCode(raw)).toBe(expected);
      expect(hashInviteCode(`  ${raw}  `)).toBe(expected);
    });
  });

  describe("createInviteCode Service", () => {
    it("creates an invitation in PostgreSQL and only stores the hash", async () => {
      const result = await createInviteCode({ createdById: adminUserId });
      createdInviteIds.push(result.invite.id);

      expect(result.rawCode).toBeDefined();
      expect(result.rawCode).toMatch(/^[a-f0-9]{64}$/);
      expect(result.invite.id).toBeDefined();
      expect(result.invite.createdById).toBe(adminUserId);

      // Verify expiration is ~7 days in the future
      const now = Date.now();
      const expiresTime = new Date(result.invite.expiresAt!).getTime();
      const expectedTime = now + DEFAULT_INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresTime - expectedTime)).toBeLessThan(5000);

      // Verify in PostgreSQL that the database stores only the SHA-256 hash
      const dbRow = await client.query(
        `SELECT "id", "codeHash", "usedById" FROM "InviteCode" WHERE "id" = $1;`,
        [result.invite.id]
      );
      expect(dbRow.rows.length).toBe(1);
      expect(dbRow.rows[0].codeHash).toBe(hashInviteCode(result.rawCode));
      expect(dbRow.rows[0].codeHash).not.toBe(result.rawCode);
      expect(dbRow.rows[0].usedById).toBeNull();
    });

    it("supports custom expiration days within bounds", async () => {
      const customDays = 14;
      const result = await createInviteCode({ createdById: adminUserId, expiresInDays: customDays });
      createdInviteIds.push(result.invite.id);

      const expiresTime = new Date(result.invite.expiresAt!).getTime();
      const expectedTime = Date.now() + customDays * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresTime - expectedTime)).toBeLessThan(5000);
    });

    it("rejects invalid expiration days (out of bounds)", async () => {
      await expect(
        createInviteCode({ createdById: adminUserId, expiresInDays: 0 })
      ).rejects.toThrow(/Expiration must be at least 1 day/);

      await expect(
        createInviteCode({ createdById: adminUserId, expiresInDays: 45 })
      ).rejects.toThrow(/Expiration cannot exceed 30 days/);
    });
  });

  describe("POST /api/admin/invites Route Handler", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/admin/invites", {
        method: "POST",
      });

      const res = await createInviteRoute(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      expect(data.error).toContain("Authentication required");
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("rejects standard USER with 403 Forbidden", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = regularToken;

      const req = new Request("http://localhost:3000/api/admin/invites", {
        method: "POST",
      });

      const res = await createInviteRoute(req);
      expect(res.status).toBe(403);

      const data = await res.json();
      expect(data.error).toContain("Administrative privileges required");
      expect(res.headers.get("Cache-Control")).toBe("no-store");
    });

    it("allows ADMIN to generate invitation code with 201 Created", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = adminToken;

      const req = new Request("http://localhost:3000/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 5 }),
      });

      const res = await createInviteRoute(req);
      expect(res.status).toBe(201);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.invite).toBeDefined();
      expect(data.invite.id).toBeDefined();
      expect(data.invite.inviteCode).toMatch(/^[a-f0-9]{64}$/);
      expect(data.invite.expiresAt).toBeDefined();

      createdInviteIds.push(data.invite.id);

      // Verify only hash is in PostgreSQL
      const dbCheck = await client.query(
        `SELECT "codeHash" FROM "InviteCode" WHERE "id" = $1;`,
        [data.invite.id]
      );
      expect(dbCheck.rows[0].codeHash).toBe(hashInviteCode(data.invite.inviteCode));
    });

    it("handles request with no body or empty JSON and applies default 7 days", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = adminToken;

      const req = new Request("http://localhost:3000/api/admin/invites", {
        method: "POST",
      });

      const res = await createInviteRoute(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      createdInviteIds.push(data.invite.id);

      const expiresTime = new Date(data.invite.expiresAt).getTime();
      const expectedTime = Date.now() + 7 * 24 * 60 * 60 * 1000;
      expect(Math.abs(expiresTime - expectedTime)).toBeLessThan(5000);
    });

    it("rejects invalid expiration parameter with 400 Bad Request", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = adminToken;

      const req = new Request("http://localhost:3000/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresInDays: 100 }), // Exceeds max 30
      });

      const res = await createInviteRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Expiration cannot exceed 30 days");
    });
  });
});
