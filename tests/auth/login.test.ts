import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { hashPassword } from "@/lib/auth/password";
import { createSession, SESSION_COOKIE_NAME, hashSessionToken } from "@/lib/auth/session";

const { Pool } = pg;

// Mock next/headers cookie store
let currentCookieJar: Record<string, string> = {};
let cookieSetHistory: Array<{ name: string; value: string; options?: Record<string, unknown> }> = [];
let cookieDeleteHistory: string[] = [];

const mockCookieSet = vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
  currentCookieJar[name] = value;
  cookieSetHistory.push({ name, value, options });
});
const mockCookieDelete = vi.fn((name: string) => {
  delete currentCookieJar[name];
  cookieDeleteHistory.push(name);
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

describe("Authentication Login & Logout Endpoints", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];

  const testUsername = `login_user_${runSlug}`;
  const testPassword = "ValidPassword_Login123!";
  let testUserId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    // Create a registered user for login tests
    testUserId = `u_login_${runSlug}`;
    const passwordHash = await hashPassword(testPassword);

    await client.query(
      `
      INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "updatedAt")
      VALUES ($1, $2, 'Login Test User', $3, 'USER', 'avatar_2', NOW());
      `,
      [testUserId, testUsername, passwordHash]
    );
    createdUserIds.push(testUserId);
  });

  beforeEach(() => {
    currentCookieJar = {};
    cookieSetHistory = [];
    cookieDeleteHistory = [];
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

  describe("POST /api/auth/login", () => {
    it("successfully logs in with valid credentials and sets session cookie", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe(testUserId);
      expect(data.user.username).toBe(testUsername);
      expect(data.user.displayName).toBe("Login Test User");
      expect(data.user.role).toBe("USER");
      expect(data.user.avatarKey).toBe("avatar_2");

      // Verify no sensitive fields returned in JSON
      expect(data.user.passwordHash).toBeUndefined();
      expect(data.rawToken).toBeUndefined();
      expect(data.sessionToken).toBeUndefined();

      // Verify session cookie was set
      expect(mockCookieSet).toHaveBeenCalledWith(
        SESSION_COOKIE_NAME,
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          expires: expect.any(Date),
        })
      );

      // Verify cookie token was hashed before storing in PostgreSQL
      const issuedToken = mockCookieSet.mock.calls[0][1];
      const tokenHash = hashSessionToken(issuedToken);

      const sessionDb = await client.query(
        `SELECT "id", "userId" FROM "Session" WHERE "sessionTokenHash" = $1;`,
        [tokenHash]
      );
      expect(sessionDb.rows.length).toBe(1);
      expect(sessionDb.rows[0].userId).toBe(testUserId);
    });

    it("supports case-insensitive username login", async () => {
      const upperUsername = testUsername.toUpperCase();
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: upperUsername,
          password: testPassword,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.user.id).toBe(testUserId);
    });

    it("rejects incorrect password with generic 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: testUsername,
          password: "WrongPassword_999!",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(data.error).toBe("Invalid username or password");
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it("rejects nonexistent username with identical generic 401 Unauthorized", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: `nonexistent_user_${runSlug}`,
          password: "SomePassword123!",
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(401);

      const data = await res.json();
      // Must match the exact same error message to avoid account enumeration
      expect(data.error).toBe("Invalid username or password");
      expect(mockCookieSet).not.toHaveBeenCalled();
    });

    it("rejects non-JSON requests with 415 Unsupported Media Type", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "text/html" },
        body: "username=alice",
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(415);

      const data = await res.json();
      expect(data.error).toContain("application/json is required");
    });

    it("rejects malformed JSON with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ broken",
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toContain("Malformed JSON");
    });

    it("rejects missing username or password with 400 Bad Request", async () => {
      const req = new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "",
          password: testPassword,
        }),
      });

      const res = await loginRoute(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBeDefined();
    });
  });

  describe("POST /api/auth/logout", () => {
    it("revokes active session in PostgreSQL and clears cookie", async () => {
      // 1. Create an active session
      const { rawToken } = await createSession(testUserId);
      const sessionHash = hashSessionToken(rawToken);

      // Verify session exists in DB
      const checkBefore = await client.query(
        `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
        [sessionHash]
      );
      expect(checkBefore.rows.length).toBe(1);

      // Put token in cookie jar
      currentCookieJar[SESSION_COOKIE_NAME] = rawToken;

      // 2. Invoke logout route
      const res = await logoutRoute();
      expect(res.status).toBe(200);
      expect(res.headers.get("Cache-Control")).toBe("no-store");

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.message).toBe("Logged out successfully");

      // Verify cookie was deleted
      expect(mockCookieDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);

      // Verify session was revoked from PostgreSQL
      const checkAfter = await client.query(
        `SELECT "id" FROM "Session" WHERE "sessionTokenHash" = $1;`,
        [sessionHash]
      );
      expect(checkAfter.rows.length).toBe(0);
    });

    it("is idempotent: succeeds safely when no active session exists", async () => {
      // No cookie set
      const res = await logoutRoute();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockCookieDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    });

    it("is idempotent: succeeds safely when an invalid session token is present", async () => {
      currentCookieJar[SESSION_COOKIE_NAME] = "fake_invalid_session_token_123456789";

      const res = await logoutRoute();
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(mockCookieDelete).toHaveBeenCalledWith(SESSION_COOKIE_NAME);
    });
  });
});
