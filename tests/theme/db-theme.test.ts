import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import db from "@/lib/db";
import { DEFAULT_THEME } from "@/lib/theme/constants";

const { Pool } = pg;

describe("Database Theme Migration & Model Verification", () => {
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
    try {
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [createdUserIds]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("verifies themeKey column specification in PostgreSQL information_schema", async () => {
    const res = await client.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'themeKey'
    `);

    expect(res.rows.length).toBe(1);
    const col = res.rows[0];
    expect(col.column_name).toBe("themeKey");
    expect(col.data_type).toBe("character varying");
    expect(col.character_maximum_length).toBe(50);
    expect(col.is_nullable).toBe("NO");
    expect(col.column_default).toContain("'obsidian-studio'");
  });

  it("verifies newly created users automatically receive obsidian-studio default", async () => {
    const userId = `u_db_th_${runSlug}`;
    createdUserIds.push(userId);

    const created = await db.user.create({
      data: {
        id: userId,
        username: `th_user_${runSlug}`,
        displayName: "Theme Test User",
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$fake$fakehash",
      },
    });

    expect(created.themeKey).toBe(DEFAULT_THEME);
    expect(created.themeKey).toBe("obsidian-studio");

    // Verify row directly via raw SQL
    const rawRes = await client.query(`SELECT "themeKey" FROM "User" WHERE "id" = $1`, [userId]);
    expect(rawRes.rows[0].themeKey).toBe("obsidian-studio");
  });

  it("allows updating themeKey to any valid theme string", async () => {
    const userId = `u_db_th2_${runSlug}`;
    createdUserIds.push(userId);

    const created = await db.user.create({
      data: {
        id: userId,
        username: `th_user2_${runSlug}`,
        displayName: "Theme Test User 2",
        passwordHash: "$argon2id$v=19$m=19456,t=2,p=1$fake$fakehash",
      },
    });

    expect(created.themeKey).toBe("obsidian-studio");

    const updated = await db.user.update({
      where: { id: userId },
      data: { themeKey: "cobalt-web" },
    });

    expect(updated.themeKey).toBe("cobalt-web");
  });
});
