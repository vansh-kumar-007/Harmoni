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

      // Verify NO stream URLs or download links are present in normalized track DTO
      expect(Object.keys(track)).not.toContain("audio");
      expect(Object.keys(track)).not.toContain("audiodownload");
      expect(Object.keys(track)).not.toContain("audiodownload_allowed");
    });

    it("handles standalone singles without album associations cleanly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [
            {
              id: "999001",
              name: "Solo Horizon",
              duration: 180,
              artist_id: "777",
              artist_name: "Echo Wave",
              album_id: null,
              album_name: "",
              album_image: "",
              image: "https://usercontent.jamendo.com?type=track&id=999001",
              shareurl: "https://www.jamendo.com/track/999001",
              license_ccurl: "https://creativecommons.org/licenses/by/4.0/",
            },
          ],
        }),
      });

      const result = await searchJamendoTracks({ query: "solo horizon" });
      expect(result.items).toHaveLength(1);
      const single = result.items[0];
      expect(single.id).toBe("999001");
      expect(single.albumId).toBeNull();
      expect(single.albumTitle).toBeNull();
      expect(single.coverUrl).toBe("https://usercontent.jamendo.com?type=track&id=999001");
      expect(single.license.code).toBe("CC BY 4.0");
      expect(single.license.isVerified).toBe(true);
    });

    it("returns empty result set for blank or whitespace query without network call", async () => {
      const fetchSpy = vi.fn();
      global.fetch = fetchSpy;

      const emptyRes = await searchJamendoTracks({ query: "   " });
      expect(emptyRes.items).toEqual([]);
      expect(emptyRes.totalCount).toBe(0);
      expect(emptyRes.hasMore).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe("Artists Search (GET /v3.0/artists)", () => {
    it("constructs correct query parameters with namesearch", async () => {
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
                id: "421168",
                name: "Luna Beats",
                website: "https://lunabeats.example.com",
                joindate: "2018-05-12",
                image: "https://usercontent.jamendo.com?type=artist&id=421168&width=300",
                shareurl: "https://www.jamendo.com/artist/421168",
                shorturl: "https://jamen.do/a/421168",
              },
            ],
          }),
        });
      });

      const result = await searchJamendoArtists({ query: "Luna Beats" });

      const parsedUrl = new URL(requestedUrl);
      expect(parsedUrl.pathname).toBe("/v3.0/artists/");
      expect(parsedUrl.searchParams.get("namesearch")).toBe("Luna Beats");

      expect(result.type).toBe("artists");
      expect(result.items).toHaveLength(1);
      const artist = result.items[0];
      expect(artist.id).toBe("421168");
      expect(artist.name).toBe("Luna Beats");
      expect(artist.website).toBe("https://lunabeats.example.com");
      expect(artist.joinDate).toBe("2018-05-12");
      expect(artist.imageUrl).toBe("https://usercontent.jamendo.com?type=artist&id=421168&width=300");
      expect(artist.jamendoUrl).toBe("https://www.jamendo.com/artist/421168");
    });
  });

  describe("Albums Search (GET /v3.0/albums)", () => {
    it("constructs correct query parameters with namesearch", async () => {
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
                id: "104336",
                name: "Season One",
                releasedate: "2011-12-29",
                artist_id: "354924",
                artist_name: "WE ARE FM",
                image: "https://usercontent.jamendo.com?type=album&id=104336&width=300",
                shareurl: "https://www.jamendo.com/list/a104336",
                zip: "https://storage.jamendo.com/download/a104336/mp32/",
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

  describe("Jamendo Response Header Validation (Status & Code Integrity)", () => {
    it("accepts documented 'succeed' status with code 0 as success", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "succeed", code: 0, results_count: 0 },
          results: [],
        }),
      });

      const result = await searchJamendoTracks({ query: "ambient" });
      expect(result.items).toEqual([]);
    });

    it("accepts official example 'success' status with code 0 as success", async () => {
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

    it("accepts status case-insensitively ('SUCCEED' and 'Success')", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "SUCCEED", code: 0, results_count: 0 },
          results: [],
        }),
      });

      const res1 = await searchJamendoTracks({ query: "ambient" });
      expect(res1.items).toEqual([]);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "Success", code: 0, results_count: 0 },
          results: [],
        }),
      });

      const res2 = await searchJamendoTracks({ query: "ambient" });
      expect(res2.items).toEqual([]);
    });

    it("rejects code 0 when status explicitly equals 'failed'", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 0, error_message: "Unexpected failure" },
          results: [],
        }),
      });

      await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
        /upstream operation failed/
      );
    });

    it("rejects missing, blank, or whitespace status values", async () => {
      const blankStatuses = ["", "   ", "\t"];
      for (const st of blankStatuses) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: st, code: 0 },
            results: [],
          }),
        });

        await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
          /missing or blank status/
        );
      }

      // Null or non-string status
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: null, code: 0 },
          results: [],
        }),
      });

      await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
        /missing or blank status/
      );
    });

    it("rejects unrecognized status values (e.g. 'pending', 'ok', 'unknown')", async () => {
      const unrecognized = ["pending", "ok", "unknown", "in_progress", "partial"];
      for (const st of unrecognized) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: st, code: 0 },
            results: [],
          }),
        });

        await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
          new RegExp(`unrecognized status value "${st}"`)
        );
      }
    });

    it("rejects missing, non-numeric, or non-integer response codes", async () => {
      const invalidCodes = [null, undefined, "0", "zero", 0.5, NaN, {}];
      for (const cd of invalidCodes) {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            headers: { status: "success", code: cd },
            results: [],
          }),
        });

        await expect(searchJamendoTracks({ query: "ambient" })).rejects.toThrowError(
          /missing or malformed response code/
        );
      }
    });
  });

  describe("Official Jamendo Response Codes Handling", () => {
    it("maps API code 1 (generic upstream exception) to API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 1, error_message: "Internal server error" },
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
        expect(jErr.message).toContain("generic upstream exception occurred");
      }
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

    it("maps API code 8 (conditional parameter missing) to API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 8, error_message: "Conditional parameter missing" },
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
        expect(jErr.message).toContain("conditional parameter missing");
      }
    });

    it("maps API code 9 (invalid response format) to API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 9, error_message: "Format error" },
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
        expect(jErr.message).toContain("invalid response format");
      }
    });

    it("maps API code 10 (invalid API entry point) to API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 10, error_message: "Invalid entry point" },
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
        expect(jErr.message).toContain("invalid API entry point");
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

    it("maps unrecognized error code (e.g. 99) to generic API_ERROR (502)", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "failed", code: 99, error_message: "Custom error" },
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
        expect(jErr.message).toContain("upstream operation failed (code 99)");
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
