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
          headers: { status: "failed", code: 1, error_message: "Invalid client_id" },
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
    it("constructs correct query parameters including include=licenses and maps normalized tracks", async () => {
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
                // Upstream might return these raw fields:
                audio: "https://prod-1.storage.jamendo.com/?trackid=1848357&format=mp31",
                audiodownload: "https://prod-1.storage.jamendo.com/download/track/1848357/mp32/",
                audiodownload_allowed: true,
              },
            ],
          }),
        });
      });

      const result = await searchJamendoTracks({ query: "night owl", limit: 10, offset: 0 });

      // Verify URL construction
      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.pathname).toBe("/v3.0/tracks/");
      expect(parsedUrl.searchParams.get("client_id")).toBe("test_valid_client_id_12345");
      expect(parsedUrl.searchParams.get("format")).toBe("json");
      expect(parsedUrl.searchParams.get("search")).toBe("night owl");
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

    it("handles single tracks without an album cleanly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
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
              album_name: "",
              image: "https://usercontent.jamendo.com?type=artist&id=7700",
              shareurl: "https://www.jamendo.com/track/99001",
              license_ccurl: "https://creativecommons.org/licenses/by/4.0/",
            },
          ],
        }),
      });

      const result = await searchJamendoTracks({ query: "acoustic" });
      expect(result.items).toHaveLength(1);
      const track = result.items[0];

      expect(track.albumId).toBeNull();
      expect(track.albumTitle).toBeNull();
      expect(track.coverUrl).toBe("https://usercontent.jamendo.com?type=artist&id=7700");
      expect(track.license.code).toBe("CC BY 4.0");
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

  describe("Upstream Error & Rate Limit Handling", () => {
    it("throws JamendoError(RATE_LIMITED) when HTTP 429 is returned", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({}),
      });

      await expect(searchJamendoTracks({ query: "chill" })).rejects.toThrowError(
        /rate limit exceeded/i
      );
    });

    it("throws JamendoError(RATE_LIMITED) when Jamendo returns header code 4", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: {
            status: "failed",
            code: 4,
            error_message: "Rate limit exceeded",
          },
          results: [],
        }),
      });

      await expect(searchJamendoTracks({ query: "chill" })).rejects.toThrowError(
        /rate limit exceeded/i
      );
    });

    it("throws JamendoError(TIMEOUT) on network abort or timeout", async () => {
      const abortError = new Error("The operation was aborted");
      abortError.name = "TimeoutError";

      global.fetch = vi.fn().mockRejectedValue(abortError);

      await expect(searchJamendoTracks({ query: "chill" })).rejects.toThrowError(
        /request timed out/i
      );
    });

    it("throws JamendoError(API_ERROR) on HTTP 500 response", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(searchJamendoTracks({ query: "chill" })).rejects.toThrowError(
        /responded with HTTP 500/i
      );
    });

    it("throws JamendoError(API_ERROR) on malformed upstream JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Unexpected token < in JSON");
        },
      });

      await expect(searchJamendoTracks({ query: "chill" })).rejects.toThrowError(
        /Malformed JSON response/i
      );
    });
  });
});
