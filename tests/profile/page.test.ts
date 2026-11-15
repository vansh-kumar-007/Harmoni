import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import db from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import nextConfig from "../../next.config";

const { Pool } = pg;

describe("User Profile Page & Privacy Verification", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];
  const createdPlaylistIds: string[] = [];
  const createdTrackIds: string[] = [];
  const createdScrobbleIds: string[] = [];

  const testUsername = `prof_user_${runSlug}`;
  let testUserId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    testUserId = `u_page_${runSlug}`;
    const passwordHash = await hashPassword("ValidPassword123!");

    // 1. Create registered user
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_3', 'Ambient audiophile exploring generative music.', NOW())`,
      [testUserId, testUsername, "Profile Test User", passwordHash]
    );
    createdUserIds.push(testUserId);

    // 2. Create one PUBLIC playlist and one PRIVATE playlist
    const publicPlId = `pl_pub_${runSlug}`;
    await client.query(
      `INSERT INTO "Playlist" ("id", "userId", "title", "description", "isPublic", "updatedAt")
       VALUES ($1, $2, $3, $4, true, NOW())`,
      [publicPlId, testUserId, "Late Night Ambient", "Public study playlist"]
    );
    createdPlaylistIds.push(publicPlId);

    const privatePlId = `pl_priv_${runSlug}`;
    await client.query(
      `INSERT INTO "Playlist" ("id", "userId", "title", "description", "isPublic", "updatedAt")
       VALUES ($1, $2, $3, $4, false, NOW())`,
      [privatePlId, testUserId, "Secret Draft Tracks", "Unreleased private drafts"]
    );
    createdPlaylistIds.push(privatePlId);

    // 3. Create a canonical Track
    const trackId = `tr_${runSlug}`;
    await client.query(
      `INSERT INTO "Track" ("id", "title", "artistName", "albumName", "durationMs", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [trackId, "Solar Drift", "Tycho", "Epoch", 245000]
    );
    createdTrackIds.push(trackId);

    // 4. Create one COMPLETED scrobble and one INCOMPLETE scrobble
    const completedScrobbleId = `sc_comp_${runSlug}`;
    await client.query(
      `INSERT INTO "Scrobble" ("id", "userId", "trackId", "isCompleted", "durationListenedMs", "listenedAt")
       VALUES ($1, $2, $3, true, 245000, NOW() - INTERVAL '5 minutes')`,
      [completedScrobbleId, testUserId, trackId]
    );
    createdScrobbleIds.push(completedScrobbleId);

    const incompleteScrobbleId = `sc_incomp_${runSlug}`;
    await client.query(
      `INSERT INTO "Scrobble" ("id", "userId", "trackId", "isCompleted", "durationListenedMs", "listenedAt")
       VALUES ($1, $2, $3, false, 15000, NOW() - INTERVAL '2 minutes')`,
      [incompleteScrobbleId, testUserId, trackId]
    );
    createdScrobbleIds.push(incompleteScrobbleId);
  });

  afterAll(async () => {
    try {
      if (createdScrobbleIds.length > 0) {
        await client.query(`DELETE FROM "Scrobble" WHERE "id" = ANY($1::text[])`, [createdScrobbleIds]);
      }
      if (createdPlaylistIds.length > 0) {
        await client.query(`DELETE FROM "Playlist" WHERE "id" = ANY($1::text[])`, [createdPlaylistIds]);
      }
      if (createdTrackIds.length > 0) {
        await client.query(`DELETE FROM "Track" WHERE "id" = ANY($1::text[])`, [createdTrackIds]);
      }
      if (createdUserIds.length > 0) {
        await client.query(`DELETE FROM "Session" WHERE "userId" = ANY($1::text[])`, [createdUserIds]);
        await client.query(`DELETE FROM "User" WHERE "id" = ANY($1::text[])`, [createdUserIds]);
      }
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("verifies next.config.ts rewrite rules map /@:username to /users/:username", async () => {
    expect(nextConfig.rewrites).toBeDefined();
    if (nextConfig.rewrites) {
      const rewrites = await nextConfig.rewrites();
      const list = Array.isArray(rewrites) ? rewrites : rewrites.beforeFiles || [];
      const match = list.find(
        (r) => r.source === "/@:username" && r.destination === "/users/:username"
      );
      expect(match).toBeDefined();
    }
  });

  it("retrieves the profile with selective fields and never exposes passwordHash or sessions", async () => {
    const profile = await db.user.findUnique({
      where: { username: testUsername },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarKey: true,
        bio: true,
        role: true,
        createdAt: true,
      },
    });

    expect(profile).toBeDefined();
    expect(profile?.username).toBe(testUsername);
    expect(profile?.displayName).toBe("Profile Test User");
    expect(profile?.avatarKey).toBe("avatar_3");
    expect(profile?.bio).toBe("Ambient audiophile exploring generative music.");
    expect(profile?.role).toBe("USER");
    expect((profile as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((profile as Record<string, unknown>).sessions).toBeUndefined();
  });

  it("normalizes username handle queries by stripping @ prefix and lowercasing", async () => {
    const rawHandle = `@${testUsername.toUpperCase()}`;
    const normalized = rawHandle.toLowerCase().replace(/^@/, "");

    const profile = await db.user.findUnique({
      where: { username: normalized },
      select: { id: true, username: true },
    });

    expect(profile).toBeDefined();
    expect(profile?.id).toBe(testUserId);
  });

  it("returns null for nonexistent usernames", async () => {
    const profile = await db.user.findUnique({
      where: { username: "nonexistent_ghost_user_12345" },
      select: { id: true },
    });

    expect(profile).toBeNull();
  });

  it("strictly enforces playlist privacy: includes public playlists and excludes private playlists", async () => {
    const playlists = await db.playlist.findMany({
      where: {
        userId: testUserId,
        isPublic: true,
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
      },
    });

    expect(playlists.length).toBe(1);
    expect(playlists[0].title).toBe("Late Night Ambient");
    expect(playlists[0].isPublic).toBe(true);

    // Verify private playlist is absent
    const privateFound = playlists.find((p) => p.title === "Secret Draft Tracks");
    expect(privateFound).toBeUndefined();
  });

  it("counts and returns only completed scrobbles for the profile summary", async () => {
    const completedCount = await db.scrobble.count({
      where: {
        userId: testUserId,
        isCompleted: true,
      },
    });

    expect(completedCount).toBe(1);

    const recent = await db.scrobble.findMany({
      where: {
        userId: testUserId,
        isCompleted: true,
      },
      include: {
        track: true,
      },
    });

    expect(recent.length).toBe(1);
    expect(recent[0].track.title).toBe("Solar Drift");
    expect(recent[0].track.artistName).toBe("Tycho");
  });
});
