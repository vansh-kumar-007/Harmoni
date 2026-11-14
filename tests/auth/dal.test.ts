import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { getCurrentUser, requireUser, requireAdmin, AuthError } from "@/lib/auth/dal";
import { setSessionCookie, getSessionCookie, deleteSessionCookie } from "@/lib/auth/cookies";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";

const { Pool } = pg;

// Mock next/headers cookie store
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

describe("Data Access Layer (DAL) & Authorization Engine", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);
  const createdUserIds: string[] = [];

  let standardUserId: string;
  let standardUserToken: string;

  let adminUserId: string;
  let adminUserToken: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    // 1. Create a Standard User (role = USER)
    standardUserId = `u_dal_${runSlug}_user`;
    const standardUsername = `std_${runSlug}`;
    const standardPassHash = await hashPassword("StandardUser_Pass123!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Standard DAL User', $3, 'USER', NOW());
      `,
      [standardUserId, standardUsername, standardPassHash]
    );
    createdUserIds.push(standardUserId);

    const standardSession = await createSession(standardUserId);
    standardUserToken = standardSession.rawToken;

    // 2. Create an Admin User (role = ADMIN)
    adminUserId = `u_dal_${runSlug}_admin`;
    const adminUsername = `adm_${runSlug}`;
    const adminPassHash = await hashPassword("AdminUser_Pass123!");

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "updatedAt")
      VALUES ($1, $2, 'Admin DAL User', $3, 'ADMIN', NOW());
      `,
      [adminUserId, adminUsername, adminPassHash]
    );
    createdUserIds.push(adminUserId);

    const adminSession = await createSession(adminUserId);
    adminUserToken = adminSession.rawToken;
  });

  beforeEach(() => {
    currentCookieJar = {};
    vi.clearAllMocks();
  });

  afterAll(async () => {
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

  describe("Cookie Helper Integration", () => {
    it("reads and writes session cookie through next/headers wrapper", async () => {
      const token = "mock_test_token_12345678901234567890";
      const expiresAt = new Date(Date.now() + 10000);

      await setSessionCookie(token, expiresAt);
      expect(mockCookieSet).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        token,
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expiresAt,
        })
      );

      const retrieved = await getSessionCookie();
      expect(retrieved).toBe(token);

      await deleteSessionCookie();
      expect(mockCookieDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
      expect(await getSessionCookie()).toBeNull();
    });
  });

  describe("getCurrentUser", () => {
    it("returns null when no session cookie is present", async () => {
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("returns null when an invalid or nonexistent token is in cookie", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = "nonexistent_token_hex_value_00000000000000000000";
      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it("returns sanitized SafeUser for valid session without passwordHash", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = standardUserToken;
      const user = await getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.id).toBe(standardUserId);
      expect(user?.displayName).toBe("Standard DAL User");
      expect(user?.role).toBe("USER");
      expect((user as unknown as Record<string, unknown>)?.passwordHash).toBeUndefined();
    });
  });

  describe("requireUser", () => {
    it("throws AuthError(UNAUTHORIZED) when user is not authenticated", async () => {
      await expect(requireUser()).rejects.toThrow(AuthError);

      try {
        await requireUser();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("UNAUTHORIZED");
      }
    });

    it("resolves SafeUser when authenticated", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = standardUserToken;
      const user = await requireUser();

      expect(user.id).toBe(standardUserId);
      expect(user.role).toBe("USER");
    });
  });

  describe("requireAdmin", () => {
    it("throws AuthError(UNAUTHORIZED) when unauthenticated", async () => {
      try {
        await requireAdmin();
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("UNAUTHORIZED");
      }
    });

    it("throws AuthError(FORBIDDEN) when authenticated as standard USER", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = standardUserToken;

      try {
        await requireAdmin();
        expect.unreachable();
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthError);
        expect((err as AuthError).code).toBe("FORBIDDEN");
        expect((err as AuthError).message).toContain("Administrative privileges required");
      }
    });

    it("succeeds and returns SafeUser when authenticated as ADMIN", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = adminUserToken;

      const adminUser = await requireAdmin();
      expect(adminUser).not.toBeNull();
      expect(adminUser.id).toBe(adminUserId);
      expect(adminUser.role).toBe("ADMIN");
      expect((adminUser as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });
});
