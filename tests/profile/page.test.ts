import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import crypto from "node:crypto";
import pg from "pg";
import { renderToString } from "react-dom/server";
import { hashPassword } from "@/lib/auth/password";
import nextConfig from "../../next.config";

// Setup Next.js mocks before importing page component
const notFoundMock = vi.fn(() => {
  const err = new Error("NEXT_NOT_FOUND");
  (err as unknown as { digest: string }).digest = "NEXT_NOT_FOUND";
  throw err;
});

const getCurrentUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => notFoundMock(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

// Import actual Server Component and generateMetadata
import UserProfilePage, { generateMetadata } from "@/app/users/[username]/page";

const { Pool } = pg;

describe("Real UserProfilePage Server Component & Privacy Verification", () => {
  let pool: pg.Pool;
  let client: pg.PoolClient;
  const runId = crypto.randomUUID();
  const runSlug = runId.replace(/-/g, "").slice(0, 12);

  const createdUserIds: string[] = [];
  const createdPlaylistIds: string[] = [];
  const createdTrackIds: string[] = [];
  const createdScrobbleIds: string[] = [];

  const testUsername = `page_user_${runSlug}`;
  let testUserId: string;

  const visitorUsername = `visitor_user_${runSlug}`;
  let visitorUserId: string;

  const emptyUsername = `empty_user_${runSlug}`;
  let emptyUserId: string;

  const publicCoverUrl = "https://cdn.example.com/covers/ambient-art.jpg";
  const privateCoverUrl = "https://cdn.example.com/covers/private-secret.jpg";
  const trackCoverUrl = "https://cdn.example.com/covers/solar-drift.jpg";

  beforeAll(async () => {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
    });
    client = await pool.connect();

    testUserId = `u_page_${runSlug}`;
    visitorUserId = `u_vis_${runSlug}`;
    emptyUserId = `u_emp_${runSlug}`;

    const passwordHash = await hashPassword("ValidPassword123!");

    // 1. Create main populated test user
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_3', 'Ambient audiophile exploring generative music.', NOW())`,
      [testUserId, testUsername, "Profile Test User", passwordHash]
    );
    createdUserIds.push(testUserId);

    // 2. Create visitor test user
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_1', 'Just browsing', NOW())`,
      [visitorUserId, visitorUsername, "Visitor User", passwordHash]
    );
    createdUserIds.push(visitorUserId);

    // 3. Create empty test user (no playlists, no scrobbles)
    await client.query(
      `INSERT INTO "User" ("id", "username", "displayName", "passwordHash", "role", "avatarKey", "bio", "updatedAt")
       VALUES ($1, $2, $3, $4, 'USER', 'avatar_5', NULL, NOW())`,
      [emptyUserId, emptyUsername, "Brand New Member", passwordHash]
    );
    createdUserIds.push(emptyUserId);

    // 4. Create one PUBLIC playlist (with cover) and one PRIVATE playlist (with cover)
    const publicPlId = `pl_pub_${runSlug}`;
    await client.query(
      `INSERT INTO "Playlist" ("id", "userId", "title", "description", "coverUrl", "isPublic", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, true, NOW())`,
      [publicPlId, testUserId, "Late Night Ambient", "Public study playlist", publicCoverUrl]
    );
    createdPlaylistIds.push(publicPlId);

    const privatePlId = `pl_priv_${runSlug}`;
    await client.query(
      `INSERT INTO "Playlist" ("id", "userId", "title", "description", "coverUrl", "isPublic", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, false, NOW())`,
      [privatePlId, testUserId, "Secret Draft Tracks", "Unreleased private drafts", privateCoverUrl]
    );
    createdPlaylistIds.push(privatePlId);

    // 5. Create canonical tracks: one completed track and one skipped track
    const trackId = `tr_${runSlug}`;
    await client.query(
      `INSERT INTO "Track" ("id", "title", "artistName", "albumName", "coverUrl", "durationMs", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [trackId, "Solar Drift", "Tycho", "Epoch", trackCoverUrl, 245000]
    );
    createdTrackIds.push(trackId);

    const skippedTrackId = `tr_skip_${runSlug}`;
    await client.query(
      `INSERT INTO "Track" ("id", "title", "artistName", "albumName", "coverUrl", "durationMs", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [skippedTrackId, "Skipped Interlude", "Unknown", null, null, 15000]
    );
    createdTrackIds.push(skippedTrackId);

    // 6. Create one COMPLETED scrobble and one INCOMPLETE scrobble
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
      [incompleteScrobbleId, testUserId, skippedTrackId]
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

  it("1. executes UserProfilePage and resolves an existing username with full data", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    expect(pageElement).toBeDefined();
    const html = renderToString(pageElement);

    expect(html).toContain("Profile Test User");
    expect(html.replace(/<!-- -->/g, "")).toContain(`@${testUsername}`);
    expect(html).toContain("Ambient audiophile exploring generative music.");
    expect(html).toContain("USER");
    expect(html).toContain("Member since");
  });

  it("2. triggers notFound() when a nonexistent username is requested", async () => {
    notFoundMock.mockClear();

    await expect(
      UserProfilePage({
        params: Promise.resolve({ username: "ghost_user_that_does_not_exist_404" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("3. renders the Edit Profile interface when the authenticated user views their own profile", async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: testUserId,
      username: testUsername,
      role: "USER",
    });

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    // Profile owner receives Edit Profile dialog trigger
    expect(html).toContain("Edit Profile");
    expect(html).not.toContain("Harmoni Member");
  });

  it("4. renders the neutral Harmoni Member indicator for visitor viewing someone else's profile", async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: visitorUserId,
      username: visitorUsername,
      role: "USER",
    });

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    // Visitor receives neutral Harmoni Member badge
    expect(html).toContain("Harmoni Member");
    // Visitor does NOT receive Edit Profile
    expect(html).not.toContain("Edit Profile");
  });

  it("5. ensures visitor receives zero profile-editing controls even with @ handle variations", async () => {
    getCurrentUserMock.mockResolvedValueOnce({
      id: visitorUserId,
      username: visitorUsername,
      role: "USER",
    });

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: `@${testUsername.toUpperCase()}` }),
    });

    const html = renderToString(pageElement);
    expect(html).not.toContain("Edit Profile");
    expect(html).toContain("Harmoni Member");
  });

  it("6. strictly passes only public playlists to the UI and excludes private playlists", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    // Public playlist must appear
    expect(html).toContain("Late Night Ambient");
    expect(html).toContain("Public study playlist");

    // Private playlist must NEVER appear in the public UI
    expect(html).not.toContain("Secret Draft Tracks");
    expect(html).not.toContain("Unreleased private drafts");
  });

  it("7. displays completed scrobbles while strictly excluding incomplete scrobbles", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    // Completed track must appear
    expect(html).toContain("Solar Drift");
    expect(html).toContain("Tycho");

    // Incomplete scrobble must NOT appear
    expect(html).not.toContain("Skipped Interlude");
  });

  it("8. renders actual playlist and track artwork URLs in the relevant UI sections", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    // Public playlist cover URL is rendered
    expect(html).toContain(`src="${publicCoverUrl}"`);
    expect(html).toContain('alt="Cover art for playlist Late Night Ambient"');

    // Track cover URL is rendered
    expect(html).toContain(`src="${trackCoverUrl}"`);
    expect(html).toContain('alt="Cover art for Solar Drift"');

    // Private playlist cover URL is NEVER rendered
    expect(html).not.toContain(privateCoverUrl);
  });

  it("9. never exposes sensitive account fields (passwordHash, sessions) in rendered HTML or data props", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: testUsername }),
    });

    const html = renderToString(pageElement);

    expect(html).not.toContain("$argon2id$");
    expect(html).not.toContain("passwordHash");
    expect(html).not.toContain("sessionToken");
    expect(html).not.toContain("sessionTokenHash");
  });

  it("10. renders genuine empty states for a member with 0 playlists and 0 scrobbles", async () => {
    getCurrentUserMock.mockResolvedValueOnce(null);

    const pageElement = await UserProfilePage({
      params: Promise.resolve({ username: emptyUsername }),
    });

    const html = renderToString(pageElement);

    expect(html).toContain("Brand New Member");
    expect(html).toContain("No scrobbles logged yet");
    expect(html).toContain("No public playlists created");
  });

  it("11. generates dynamic metadata accurately for existing and nonexistent users", async () => {
    const metaValid = await generateMetadata({
      params: Promise.resolve({ username: testUsername }),
    });
    expect(metaValid.title).toBe(`Profile Test User (@${testUsername}) — Harmoni`);

    const meta404 = await generateMetadata({
      params: Promise.resolve({ username: "ghost_user_not_found" }),
    });
    expect(meta404.title).toBe("User Not Found — Harmoni");
  });

  it("12. verifies next.config.ts rewrite rules map /@:username to /users/:username", async () => {
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
});
