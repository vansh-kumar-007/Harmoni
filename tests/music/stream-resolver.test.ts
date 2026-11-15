import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  resolveJamendoTrackStream,
  isValidJamendoStreamUrl,
  JamendoError,
} from "@/lib/music/providers/jamendo";

describe("Jamendo Stream Resolver", () => {
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

  describe("isValidJamendoStreamUrl", () => {
    it("accepts legitimate storage.jamendo.com and its storage subdomains", () => {
      expect(
        isValidJamendoStreamUrl("https://storage.jamendo.com/?trackid=123&format=mp32")
      ).toBe(true);
      expect(
        isValidJamendoStreamUrl("https://prod-1.storage.jamendo.com/?trackid=123&format=mp32&u=0")
      ).toBe(true);
      expect(
        isValidJamendoStreamUrl("https://prod-2.storage.jamendo.com/audio/123.mp3")
      ).toBe(true);
      expect(
        isValidJamendoStreamUrl("https://edge.storage.jamendo.com/stream/123.mp3")
      ).toBe(true);
    });

    it("rejects non-storage Jamendo subdomains, image CDNs, and API hosts", () => {
      // Image CDN host
      expect(
        isValidJamendoStreamUrl("https://usercontent.jamendo.com/audio/123.mp3")
      ).toBe(false);
      // API entry point
      expect(
        isValidJamendoStreamUrl("https://api.jamendo.com/audio/123.mp3")
      ).toBe(false);
      // Main website
      expect(
        isValidJamendoStreamUrl("https://jamendo.com/audio/123.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://www.jamendo.com/audio/123.mp3")
      ).toBe(false);
    });

    it("rejects download-oriented Jamendo hosts", () => {
      expect(
        isValidJamendoStreamUrl("https://mp3d.jamendo.com/download/track/123/mp32/")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://mp3l.jamendo.com/download/track/123/mp32/")
      ).toBe(false);
    });

    it("rejects licensing domains and their storage subdomains", () => {
      expect(
        isValidJamendoStreamUrl("https://jamendo-licensing.com/audio/123.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://prod-1.storage.jamendo-licensing.com/audio.mp3")
      ).toBe(false);
    });

    it("rejects non-HTTPS URLs", () => {
      expect(
        isValidJamendoStreamUrl("http://storage.jamendo.com/audio/123.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("http://prod-1.storage.jamendo.com/audio/123.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("ftp://storage.jamendo.com/audio/123.mp3")
      ).toBe(false);
    });

    it("rejects untrusted domains, spoofed subdomains, and crafted suffixes", () => {
      expect(
        isValidJamendoStreamUrl("https://eviljamendo.com/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://evil-storage.jamendo.com/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://storage.jamendo.com.attacker.com/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://attacker.com/storage.jamendo.com/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://jamendo.org/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://127.0.0.1/audio.mp3")
      ).toBe(false);
    });

    it("rejects URLs with credentials or non-standard ports", () => {
      expect(
        isValidJamendoStreamUrl("https://user:password@storage.jamendo.com/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://storage.jamendo.com:8080/audio.mp3")
      ).toBe(false);
      expect(
        isValidJamendoStreamUrl("https://prod-1.storage.jamendo.com:444/audio.mp3")
      ).toBe(false);
    });

    it("rejects invalid or empty input", () => {
      expect(isValidJamendoStreamUrl("")).toBe(false);
      // @ts-expect-error Testing invalid runtime types
      expect(isValidJamendoStreamUrl(null)).toBe(false);
      // @ts-expect-error Testing invalid runtime types
      expect(isValidJamendoStreamUrl(undefined)).toBe(false);
      expect(isValidJamendoStreamUrl("not-a-url")).toBe(false);
    });
  });

  describe("resolveJamendoTrackStream", () => {
    const validTrackId = "1894215";
    const sampleRawTrack = {
      id: "1894215",
      name: "Ambient Waves",
      duration: 195,
      artist_id: "4421",
      artist_name: "Aurora Sound",
      album_id: "9910",
      album_name: "Cosmic Drift",
      image: "https://usercontent.jamendo.com?type=album&id=9910&width=300",
      shareurl: "https://www.jamendo.com/track/1894215/ambient-waves",
      license_ccurl: "http://creativecommons.org/licenses/by-nc-sa/4.0/",
      licenses: { "cc:by-nc-sa": "4.0" },
      audio: "https://prod-1.storage.jamendo.com/?trackid=1894215&format=mp32&u=0",
      audiodownload: "https://mp3d.jamendo.com/download/track/1894215/mp32/",
    };

    it("rejects zero, negative, decimal, non-numeric, and empty track IDs with HTTP 400", async () => {
      await expect(resolveJamendoTrackStream("")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("0")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("000")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("-123")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("12.34")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("abc")).rejects.toThrow(JamendoError);
      await expect(resolveJamendoTrackStream("123abc")).rejects.toThrow(JamendoError);

      try {
        await resolveJamendoTrackStream("0");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(400);
      }
    });

    it("safely handles large numeric IDs as strings without precision loss", async () => {
      const largeId = "9007199254740999"; // Exceeds Number.MAX_SAFE_INTEGER
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [{ ...sampleRawTrack, id: largeId }],
        }),
      });

      const result = await resolveJamendoTrackStream(largeId);
      expect(result.track.id).toBe(largeId);
      const calledUrl = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string);
      expect(calledUrl.searchParams.get("id")).toBe(largeId);
    });

    it("fetches single track from Jamendo with mp32 audioformat and licenses include", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [sampleRawTrack],
        }),
      });

      const result = await resolveJamendoTrackStream(validTrackId);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const calledUrl = new URL(vi.mocked(global.fetch).mock.calls[0][0] as string);
      expect(calledUrl.origin).toBe("https://api.jamendo.com");
      expect(calledUrl.pathname).toBe("/v3.0/tracks/");
      expect(calledUrl.searchParams.get("id")).toBe("1894215");
      expect(calledUrl.searchParams.get("type")).toBe("single albumtrack");
      expect(calledUrl.searchParams.get("audioformat")).toBe("mp32");
      expect(calledUrl.searchParams.get("include")).toBe("licenses");
      expect(calledUrl.searchParams.get("fullcount")).toBeNull();

      // Verify returned stream object
      expect(result.streamUrl).toBe("https://prod-1.storage.jamendo.com/?trackid=1894215&format=mp32&u=0");
      expect(result.format).toBe("mp3");
      expect(result.bitrate).toBe(128);

      // Verify normalized track metadata
      expect(result.track.id).toBe("1894215");
      expect(result.track.title).toBe("Ambient Waves");
      expect(result.track.artistName).toBe("Aurora Sound");
      expect(result.track.license.code).toBe("CC BY-NC-SA 4.0");
      expect(result.track.license.isVerified).toBe(true);

      // Verify audiodownload was NOT used as streamUrl
      expect(result.streamUrl).not.toBe(sampleRawTrack.audiodownload);
    });

    it("throws 502 if upstream returns a mismatched track ID", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [{ ...sampleRawTrack, id: "9999999" }], // Different ID returned
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have thrown 502 for mismatched track ID");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(502);
        expect((err as JamendoError).message).toContain("does not match requested ID");
      }
    });

    it("throws 502 if upstream returns multiple results for a single-track ID query", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 2 },
          results: [sampleRawTrack, { ...sampleRawTrack, id: "1894216" }],
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have thrown 502 for unexpected multiple results");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(502);
        expect((err as JamendoError).message).toContain("returned 2 tracks for single-track ID query");
      }
    });

    it("throws 404 when track is not found on Jamendo", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 0 },
          results: [],
        }),
      });

      try {
        await resolveJamendoTrackStream("9999999");
        expect.unreachable("Should have thrown 404");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(404);
        expect((err as JamendoError).message).toContain("not found on Jamendo");
      }
    });

    it("refuses playback with 403 when track has an unverified CC license", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [
            {
              ...sampleRawTrack,
              license_ccurl: "https://unknown-license.com/terms",
              licenses: null,
            },
          ],
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have refused playback for unverified license");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(403);
        expect((err as JamendoError).message).toContain("unverified or unrecognized license");
      }
    });

    it("throws 502 when Jamendo provides no audio field", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [
            {
              ...sampleRawTrack,
              audio: null,
            },
          ],
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have thrown 502");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(502);
        expect((err as JamendoError).message).toContain("No streaming audio URL available");
      }
    });

    it("throws 502 when Jamendo returns an untrusted or non-storage audio host", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: "success", code: 0, results_count: 1 },
          results: [
            {
              ...sampleRawTrack,
              audio: "https://usercontent.jamendo.com/audio/stream.mp3",
            },
          ],
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have thrown 502");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(502);
        expect((err as JamendoError).message).toContain("Untrusted or invalid audio stream URL");
      }
    });

    it("propagates Jamendo upstream rate limiting as 429", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({
          headers: { status: "failed", code: 6, error_message: "Rate limit exceeded" },
        }),
      });

      try {
        await resolveJamendoTrackStream(validTrackId);
        expect.unreachable("Should have thrown 429");
      } catch (err) {
        expect(err).toBeInstanceOf(JamendoError);
        expect((err as JamendoError).statusCode).toBe(429);
        expect((err as JamendoError).code).toBe("RATE_LIMITED");
      }
    });
  });
});
