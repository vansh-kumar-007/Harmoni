import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { PATCH as updateProfileRoute } from "@/app/api/users/me/profile/route";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { AVATAR_REGISTRY } from "@/lib/profile/constants";

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

describe("Authenticated Profile Update API (PATCH /api/users/me/profile)", () => {
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
    userAId = `u_pr_a_${runSlug}`;
    const passwordHashA = await hashPassword("ValidPasswordA123!");
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_1', 'Original Bio A', NOW())`,
      [userAId, `user_pra_${runSlug}`, "User Pro A", passwordHashA]
    );
    createdUserIds.push(userAId);

    const sessionA = await createSession(userAId);
    userARawToken = sessionA.rawToken;

    // Create User B (for user isolation verification)
    userBId = `u_pr_b_${runSlug}`;
    const passwordHashB = await hashPassword("ValidPasswordB123!");
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_2', 'Original Bio B', NOW())`,
      [userBId, `user_prb_${runSlug}`, "User Pro B", passwordHashB]
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

  it("returns 401 when the request is unauthenticated", async () => {
    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarKey: "avatar_3" }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("updates both avatarKey and bio and returns sanitized SafeUser with 200", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatarKey: "avatar_5",
        bio: "Curating ambient electronic sounds and modular synth patches.",
      }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.user.avatarKey).toBe("avatar_5");
    expect(body.user.bio).toBe("Curating ambient electronic sounds and modular synth patches.");
    expect(body.user.passwordHash).toBeUndefined();

    // Verify directly in PostgreSQL
    const dbRes = await client.query(`SELECT "avatarKey", "bio" FROM "User" WHERE "id" = $1`, [userAId]);
    expect(dbRes.rows[0].avatarKey).toBe("avatar_5");
    expect(dbRes.rows[0].bio).toBe("Curating ambient electronic sounds and modular synth patches.");
  });

  it("updates across all 8 registered avatar keys successfully", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    for (const key of AVATAR_REGISTRY) {
      const request = new Request("http://localhost:3000/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarKey: key }),
      });

      const response = await updateProfileRoute(request);
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.user.avatarKey).toBe(key);
    }
  });

  it("normalizes empty or whitespace-only bio to null in the database", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: "   " }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.bio).toBeNull();

    const dbRes = await client.query(`SELECT "bio" FROM "User" WHERE "id" = $1`, [userAId]);
    expect(dbRes.rows[0].bio).toBeNull();
  });

  it("accepts a bio of exactly 250 characters", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const maxBio = "a".repeat(250);
    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: maxBio }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.user.bio.length).toBe(250);
  });

  it("rejects a bio exceeding 250 characters with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const tooLongBio = "a".repeat(251);
    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio: tooLongBio }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("250 characters");
  });

  it("rejects an invalid or unknown avatarKey with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarKey: "avatar_99" }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain("avatar");
  });

  it("rejects payloads that provide neither avatarKey nor bio with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(400);
  });

  it("strictly isolates user updates and never modifies another user's record", async () => {
    // User B starts with avatar_2 and Original Bio B
    const beforeB = await client.query(`SELECT "avatarKey", "bio" FROM "User" WHERE "id" = $1`, [userBId]);
    expect(beforeB.rows[0].avatarKey).toBe("avatar_2");
    expect(beforeB.rows[0].bio).toBe("Original Bio B");

    // User A authenticates and updates their profile
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;
    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarKey: "avatar_7", bio: "User A Updated Bio" }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(200);

    // Verify User A changed
    const afterA = await client.query(`SELECT "avatarKey", "bio" FROM "User" WHERE "id" = $1`, [userAId]);
    expect(afterA.rows[0].avatarKey).toBe("avatar_7");
    expect(afterA.rows[0].bio).toBe("User A Updated Bio");

    // Verify User B remained untouched
    const afterB = await client.query(`SELECT "avatarKey", "bio" FROM "User" WHERE "id" = $1`, [userBId]);
    expect(afterB.rows[0].avatarKey).toBe("avatar_2");
    expect(afterB.rows[0].bio).toBe("Original Bio B");
  });

  it("rejects malformed JSON payloads with 400", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: '{"avatarKey": "avatar_1", invalidJson}',
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(400);
  });

  it("rejects unsupported media types with 415", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "text/plain" },
      body: "avatarKey=avatar_1",
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(415);
  });

  it("rejects oversized request bodies exceeding 64 KiB with 413", async () => {
    currentCookieJar[SESSION_COOKIE_NAME] = userARawToken;

    const largePadding = "x".repeat(65 * 1024);
    const request = new Request("http://localhost:3000/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarKey: "avatar_1", padding: largePadding }),
    });

    const response = await updateProfileRoute(request);
    expect(response.status).toBe(413);
  });
});
