import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { PATCH as updateThemeRoute } from "@/app/api/users/me/theme/route";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { THEME_REGISTRY, DEFAULT_THEME } from "@/lib/theme/constants";

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

describe("Authenticated Theme Preference API (PATCH /api/users/me/theme)", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];

  let userAId: string;
  let userARawToken: string;
  let userBId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    // Create User A
    userAId = `u_th_a_${runSlug}`;
    const passwordHashA = await hashPassword("ValidPasswordA123!");
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "themeKey", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', $5, NOW())`,
      [userAId, `user_a_${runSlug}`, "User A", passwordHashA, DEFAULT_THEME]
    );
    createdUserIds.push(userAId);

    const sessionA = await createSession(userAId);
    userARawToken = sessionA.rawToken;

    // Create User B (for user isolation verification)
    userBId = `u_th_b_${runSlug}`;
    const passwordHashB = await hashPassword("ValidPasswordB123!");
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "themeKey", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', $5, NOW())`,
      [userBId, `user_b_${runSlug}`, "User B", passwordHashB, DEFAULT_THEME]
    );
    createdUserIds.push(userBId);
  });

  afterAll(async () => {
    try {
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "Session" WHERE "userId" = ANY($1::text[])`, [createdUserIds]);
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [createdUserIds]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  });

  beforeEach(() => {
    currentCookieJar = {};
    mockCookieSet.mockClear();
    mockCookieDelete.mockClear();
  });

  it("returns 401 when the request is unauthenticated (no session cookie)", async () => {
    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey: "nordic-aurora" }),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("updates the current user's theme preference and returns 200 with sanitized data", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey: "nordic-aurora" }),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.themeKey).toBe("nordic-aurora");
    expect(body.passwordHash).toBeUndefined();
    expect(body.sessions).toBeUndefined();

    // Verify directly in PostgreSQL
    const dbRes = await client.query(`SELECT "themeKey" FROM "User" WHERE "id" = $1`, [userAId]);
    expect(dbRes.rows[0].themeKey).toBe("nordic-aurora");
  });

  it("successfully updates across all five registered themes", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    for (const key of THEME_REGISTRY) {
      const request = new Request("http://localhost:3000/api/users/me/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeKey: key }),
      });

      const response = await updateThemeRoute(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.themeKey).toBe(key);
    }
  });

  it("strictly isolates user preferences and never updates another user's record", async () => {
    // User B starts with obsidian-studio
    const beforeB = await client.query(`SELECT "themeKey" FROM "User" WHERE "id" = $1`, [userBId]);
    expect(beforeB.rows[0].themeKey).toBe("obsidian-studio");

    // User A authenticates and updates to crimson-vigil
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;
    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey: "crimson-vigil" }),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(200);

    // Verify User A was updated
    const afterA = await client.query(`SELECT "themeKey" FROM "User" WHERE "id" = $1`, [userAId]);
    expect(afterA.rows[0].themeKey).toBe("crimson-vigil");

    // Verify User B was NOT modified
    const afterB = await client.query(`SELECT "themeKey" FROM "User" WHERE "id" = $1`, [userBId]);
    expect(afterB.rows[0].themeKey).toBe("obsidian-studio");
  });

  it("rejects unregistered/unknown theme identifiers with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey: "spider-man-custom" }),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("Invalid theme");
  });

  it("rejects payloads missing the themeKey property with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(400);
  });

  it("rejects malformed JSON payloads with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: '{"themeKey": "nordic-aurora", malformed}',
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  it("rejects unsupported media types with 415", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "text/plain" },
      body: "themeKey=nordic-aurora",
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(415);
  });

  it("rejects oversized request bodies exceeding 64 KiB with 413", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const largePadding = "a".repeat(65 * 1024);
    const request = new Request("http://localhost:3000/api/users/me/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ themeKey: "nordic-aurora", padding: largePadding }),
    });

    const response = await updateThemeRoute(request);
    expect(response.status).toBe(413);
  });
});
