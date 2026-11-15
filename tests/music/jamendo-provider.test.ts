import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchJamendoTracks,
  searchJamendoArtists,
  searchJamendoAlbums,
  isJamendoConfigured,
  JamendoError,
} from "@/lib/music/providers/jamendo";

describe("Jamendo Music Provider Layer", () => {
  const originalClientId = process.env.JAMENDO_CLIENT_ID;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JAMENDO_CLIENT_ID = "test_valid_client_id_12345";
  });

  afterEach(() => {
    process.env.JAMENDO_CLIENT_ID = originalClientId;
    global.fetch = originalFetch;
  });

  describe("Configuration & Secrets Management", () => {
    it("reports not configured when JAMENDO_CLIENT_ID is missing or default placeholder", () => {
      delete process.env.JAMENDO_CLIENT_ID;
      expect(isJamendoConfigured()).toBe(false);

      process.env.JAMENDO_CLIENT_ID = "your_free_jamendo_client_id_here";
      expect(isJamendoConfigured()).toBe(false);

      process.env.JAMENDO_CLIENT_ID = "   ";
      expect(isJamendoConfigured()).toBe(false);
    });

    it("reports configured when a non-empty client ID is present", () => {
      process.env.JAMENDO_CLIENT_ID = "custom_secret_client_id";
      expect(isJamendoConfigured()).toBe(true);
    });

    it("throws JamendoError(NOT_CONFIGURED) on search when client ID is missing", async () => {
      delete process.env.JAMENDO_CLIENT_ID;

      await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
        /Jamendo API client ID is not configured/
      );
    });

    it("never leaks the client ID in error messages when an upstream error occurs", async () => {
      const secretId = "super_secret_id_9999";
      process.env.JAMENDO_CLIENT_ID = secretId;

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          headers: { status: "failed", code: 5, error_message: "Invalid client_id" },
        }),
      });

      try {
        await searchJamendoTracks({ query: "jazz" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jamendoErr = err as JamendoError;
        expect(jamendoErr.message).not.toContain(secretId);
      }
    });
  });

  describe("Tracks Search (GET /v3.0/tracks)", () => {
    it("constructs correct query parameters including type=single albumtrack and include=licenses", async () => {
      let requestedUrl = "";

      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            headers: {
              status: "success",
              code: 0,
              error_message: "",
              warnings: "",
              results_count: 1,
              results_fullcount: 100,
            },
            results: [
              {
                id: "1848357",
                name: "Night Owl Groove",
                duration: 215,
                artist_id: "421168",
                artist_name: "Luna Beats",
                album_id: "368084",
                album_name: "Midnight Sketches",
                album_image: "https://usercontent.jamendo.com?type=album&id=368084&width=300",
                image: "https://usercontent.jamendo.com?type=track&id=1848357",
                shareurl: "https://www.jamendo.com/track/1848357",
                shorturl: "https://jamen.do/t/1848357",
                license_ccurl: "http://creativecommons.org/licenses/by-nc-sa/3.0/",
                licenses: { ccnc: "true", ccsa: "true", ccnd: "false" },
                // Upstream raw stream fields:
                audio: "https://prod-1.storage.jamendo.com/?trackid=1848357&format=mp31",
                audiodownload: "https://prod-1.storage.jamendo.com/download/track/1848357/mp32/",
                audiodownload_allowed: true,
              },
            ],
          }),
        });
      });

      const result = await searchJamendoTracks({ query: "night owl", limit: 10, offset: 0 });

      // Verify outgoing URL construction
      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.pathname).toBe("/v3.0/tracks/");
      expect(parsedUrl.searchParams.get("client_id")).toBe("test_valid_client_id_12345");
      expect(parsedUrl.searchParams.get("format")).toBe("json");
      expect(parsedUrl.searchParams.get("search")).toBe("night owl");
      // Must include both singles and album tracks
      expect(parsedUrl.searchParams.get("type")).toBe("single albumtrack");
      expect(parsedUrl.searchParams.get("limit")).toBe("10");
      expect(parsedUrl.searchParams.get("offset")).toBe("0");
      expect(parsedUrl.searchParams.get("include")).toBe("licenses");

      // Verify normalized output
      expect(result.type).toBe("tracks");
      expect(result.query).toBe("night owl");
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
      expect(result.totalCount).toBe(100);
      expect(result.items).toHaveLength(1);

      const track = result.items[0];
      expect(track.id).toBe("1848357");
      expect(track.provider).toBe("JAMENDO");
      expect(track.title).toBe("Night Owl Groove");
      expect(track.artistName).toBe("Luna Beats");
      expect(track.albumTitle).toBe("Midnight Sketches");
      expect(track.durationSeconds).toBe(215);
      expect(track.durationFormatted).toBe("3:35");
      expect(track.coverUrl).toBe("https://usercontent.jamendo.com?type=album&id=368084&width=300");
      expect(track.jamendoUrl).toBe("https://www.jamendo.com/track/1848357");

      // Verify licensing
      expect(track.license.code).toBe("CC BY-NC-SA 3.0");
      expect(track.license.isVerified).toBe(true);
      expect(track.license.nonCommercial).toBe(true);
      expect(track.license.shareAlike).toBe(true);

      // Verify NO stream URLs or download links leak into normalized track
      const rawKeys = Object.keys(track);
      expect(rawKeys).not.toContain("audio");
      expect(rawKeys).not.toContain("audiodownload");
      expect(rawKeys).not.toContain("audiodownload_allowed");
    });

    it("correctly handles standalone singles with null album fields and verifies outgoing type parameter", async () => {
      let requestedUrl = "";

      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: "success", code: 0, results_count: 1 },
            results: [
              {
                id: "99001",
                name: "Solo Acoustic Session",
                duration: 180,
                artist_id: "7700",
                artist_name: "Elena Woods",
                album_id: null,
                album_name: null,
                album_image: null,
                image: "https://usercontent.jamendo.com?type=artist&id=7700",
                shareurl: "https://www.jamendo.com/track/99001",
                license_ccurl: "https://creativecommons.org/licenses/by/4.0/",
                audio: "https://prod-1.storage.jamendo.com/?trackid=99001",
                audiodownload: "https://prod-1.storage.jamendo.com/download/track/99001",
              },
            ],
          }),
        });
      });

      const result = await searchJamendoTracks({ query: "acoustic" });

      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.searchParams.get("type")).toBe("single albumtrack");

      expect(result.items).toHaveLength(1);
      const track = result.items[0];

      expect(track.albumId).toBeNull();
      expect(track.albumTitle).toBeNull();
      expect(track.coverUrl).toBe("https://usercontent.jamendo.com?type=artist&id=7700");
      expect(track.license.code).toBe("CC BY 4.0");

      const rawKeys = Object.keys(track);
      expect(rawKeys).not.toContain("audio");
      expect(rawKeys).not.toContain("audiodownload");
    });

    it("accepts both 'success' and 'succeed' as valid API status strings when code is 0", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "succeed", code: 0, results_count: 0 },
          results: [],
        }),
      });

      const result = await searchJamendoTracks({ query: "ambient" });
      expect(result.items).toHaveLength(0);
    });

    it("returns empty result page without calling fetch when query is empty", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const result = await searchJamendoTracks({ query: "   " });
      expect(result.items).toHaveLength(0);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Artists Search (GET /v3.0/artists)", () => {
    it("constructs correct query parameters using namesearch and maps artists", async () => {
      let requestedUrl = "";

      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: "success", code: 0, results_count: 1, results_fullcount: 1 },
            results: [
              {
                id: "376782",
                name: "WE ARE FM",
                website: "https://www.facebook.com/wearefm",
                joindate: "2011-12-29",
                image: "https://usercontent.jamendo.com?type=artist&id=376782&width=300",
                shareurl: "https://www.jamendo.com/artist/376782",
              },
            ],
          }),
        });
      });

      const result = await searchJamendoArtists({ query: "FM", limit: 20, offset: 0 });

      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.pathname).toBe("/v3.0/artists/");
      expect(parsedUrl.searchParams.get("namesearch")).toBe("FM");
      expect(parsedUrl.searchParams.has("search")).toBe(false);

      expect(result.type).toBe("artists");
      expect(result.items).toHaveLength(1);
      const artist = result.items[0];
      expect(artist.id).toBe("376782");
      expect(artist.name).toBe("WE ARE FM");
      expect(artist.website).toBe("https://www.facebook.com/wearefm");
      expect(artist.joinDate).toBe("2011-12-29");
      expect(artist.jamendoUrl).toBe("https://www.jamendo.com/artist/376782");
    });
  });

  describe("Albums Search (GET /v3.0/albums)", () => {
    it("constructs correct query parameters using namesearch and maps albums without exposing zip links", async () => {
      let requestedUrl = "";

      global.fetch = vi.fn().mockImplementation((url: string) => {
        requestedUrl = url;
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: "success", code: 0, results_count: 1, results_fullcount: 1 },
            results: [
              {
                id: "104336",
                name: "Season One",
                releasedate: "2011-12-29",
                artist_id: "376782",
                artist_name: "WE ARE FM",
                image: "https://usercontent.jamendo.com?type=album&id=104336&width=300",
                zip: "https://storage.jamendo.com/download/a104336/mp32/",
                shareurl: "https://www.jamendo.com/list/a104336",
              },
            ],
          }),
        });
      });

      const result = await searchJamendoAlbums({ query: "Season One" });

      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.pathname).toBe("/v3.0/albums/");
      expect(parsedUrl.searchParams.get("namesearch")).toBe("Season One");

      expect(result.type).toBe("albums");
      expect(result.items).toHaveLength(1);
      const album = result.items[0];
      expect(album.id).toBe("104336");
      expect(album.title).toBe("Season One");
      expect(album.artistName).toBe("WE ARE FM");
      expect(album.releaseDate).toBe("2011-12-29");
      expect(album.jamendoUrl).toBe("https://www.jamendo.com/list/a104336");

      // Verify NO zip download URL is leaked in normalized album
      expect(Object.keys(album)).not.toContain("zip");
    });
  });

  describe("Official Jamendo Response Codes Handling", () => {
    it("handles API code 0 as success", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 0 },
          results: [],
        }),
      });

      const result = await searchJamendoTracks({ query: "ambient" });
      expect(result.items).toEqual([]);
    });

    it("maps API code 2 (unsupported HTTP method) to API_ERROR (502), not rate limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 2, error_message: "Method Not Allowed" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("unsupported HTTP method");
      }
    });

    it("maps API code 3 (invalid parameter) to API_ERROR (502), not rate limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 3, error_message: "Invalid parameter" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("invalid query parameter");
      }
    });

    it("maps API code 4 (missing required parameter) to API_ERROR (502), not rate limit", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 4, error_message: "Parameter missing" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("required parameter missing");
      }
    });

    it("maps API code 5 (invalid client ID) to INVALID_CREDENTIALS (503)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 5, error_message: "Invalid client_id" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("INVALID_CREDENTIALS");
        expect(jErr.statusCode).toBe(503);
        expect(jErr.message).toContain("client ID is invalid");
      }
    });

    it("maps API code 6 (rate limit exceeded) to RATE_LIMITED (429)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 6, error_message: "Too Many Requests" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("RATE_LIMITED");
        expect(jErr.statusCode).toBe(429);
        expect(jErr.message).toContain("rate limit exceeded");
      }
    });

    it("maps API code 7 (method not found) to API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 7, error_message: "Method not found" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("requested method not found");
      }
    });

    it("maps API code 11 (suspended application) to INVALID_CREDENTIALS (503)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 11, error_message: "Application suspended" },
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("INVALID_CREDENTIALS");
        expect(jErr.statusCode).toBe(503);
        expect(jErr.message).toContain("application is suspended");
      }
    });

    it("throws JamendoError(API_ERROR) on missing or malformed headers in response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          results: [],
        }),
      });

      try {
        await searchJamendoTracks({ query: "ambient" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("missing or invalid headers");
      }
    });

    it("throws JamendoError(RATE_LIMITED) when HTTP status is 429", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      try {
        await searchJamendoTracks({ query: "chill" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("RATE_LIMITED");
        expect(jErr.statusCode).toBe(429);
      }
    });

    it("throws JamendoError(TIMEOUT) on network abort or timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "TimeoutError";

      global.fetch = vi.fn().mockRejectedValue(abortError);

      try {
        await searchJamendoTracks({ query: "chill" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("TIMEOUT");
        expect(jErr.statusCode).toBe(504);
      }
    });

    it("throws JamendoError(API_ERROR) on HTTP 500 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      try {
        await searchJamendoTracks({ query: "chill" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(500);
      }
    });

    it("throws JamendoError(API_ERROR) on malformed upstream JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Unexpected token < in JSON");
        },
      });

      try {
        await searchJamendoTracks({ query: "chill" });
        expect.unreachable("Should have thrown");
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(JamendoError);
        const jErr = err as JamendoError;
        expect(jErr.code).toBe("API_ERROR");
        expect(jErr.statusCode).toBe(502);
        expect(jErr.message).toContain("Malformed JSON response");
      }
    });
  });
});
