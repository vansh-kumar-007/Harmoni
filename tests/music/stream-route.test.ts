import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getCurrentUserMock = vi.fn();
const resolveJamendoTrackStreamMock = vi.fn();
const isConfiguredMock = vi.fn();

vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/music/providers/jamendo", () => ({
  resolveJamendoTrackStream: (...args: unknown[]) => resolveJamendoTrackStreamMock(...args),
  isJamendoConfigured: () => isConfiguredMock(),
  JamendoError: class JamendoError extends Error {
    code: string;
    statusCode?: number;
    constructor(message: string, code: string, statusCode?: number) {
      super(message);
      this.name = "JamendoError";
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

import { GET } from "@/app/api/music/stream-url/route";
import { JamendoError } from "@/lib/music/providers/jamendo";

describe("Protected Stream URL Route (GET /api/music/stream-url)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isConfiguredMock.mockReturnValue(true);
    getCurrentUserMock.mockResolvedValue({
      id: "u_test_streamer",
      username: "streamer",
      displayName: "Streamer",
      avatarKey: "avatar_1",
      role: "USER",
      themeKey: "obsidian-studio",
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Authentication Guard", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=12345");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Authentication required");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  describe("Parameter Validation", () => {
    it("returns 400 Bad Request when trackId parameter is missing", async () => {
      const request = new Request("http://localhost:3000/api/music/stream-url");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("trackId");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });

    it("returns 400 Bad Request when trackId is empty string", async () => {
      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("trackId");
    });

    it("returns 400 Bad Request when trackId is non-numeric", async () => {
      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=track_abc");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("positive integer");
    });

    it("returns 400 Bad Request when trackId is zero", async () => {
      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=0");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("positive integer");
    });

    it("returns 400 Bad Request when trackId is negative or decimal", async () => {
      const requestNeg = new Request("http://localhost:3000/api/music/stream-url?trackId=-12345");
      const responseNeg = await GET(requestNeg);
      const dataNeg = await responseNeg.json();

      expect(responseNeg.status).toBe(400);
      expect(dataNeg.success).toBe(false);
      expect(dataNeg.error).toContain("positive integer");

      const requestDec = new Request("http://localhost:3000/api/music/stream-url?trackId=12.34");
      const responseDec = await GET(requestDec);
      const dataDec = await responseDec.json();

      expect(responseDec.status).toBe(400);
      expect(dataDec.success).toBe(false);
      expect(dataDec.error).toContain("positive integer");
    });
  });

  describe("Provider Configuration", () => {
    it("returns 503 Service Unavailable when Jamendo provider is unconfigured", async () => {
      isConfiguredMock.mockReturnValue(false);

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=12345");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.configured).toBe(false);
      expect(data.error).toContain("not configured");
      expect(resolveJamendoTrackStreamMock).not.toHaveBeenCalled();
    });
  });

  describe("Stream Resolution", () => {
    it("returns 200 with resolved stream and no-store headers on success", async () => {
      const mockResult = {
        track: {
          id: "1894215",
          provider: "JAMENDO",
          title: "Ambient Waves",
          artistId: "4421",
          artistName: "Aurora Sound",
          albumId: null,
          albumTitle: null,
          durationSeconds: 195,
          durationFormatted: "3:15",
          coverUrl: "https://usercontent.jamendo.com/cover.jpg",
          jamendoUrl: "https://www.jamendo.com/track/1894215",
          license: {
            code: "CC BY 4.0",
            name: "Creative Commons Attribution 4.0",
            url: "https://creativecommons.org/licenses/by/4.0/",
            isCreativeCommons: true,
            isVerified: true,
            nonCommercial: false,
            shareAlike: false,
            noDerivatives: false,
          },
        },
        streamUrl: "https://prod-1.storage.jamendo.com/?trackid=1894215&format=mp32&u=0",
        format: "mp3",
        bitrate: 128,
      };

      resolveJamendoTrackStreamMock.mockResolvedValueOnce(mockResult);

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=1894215");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.streamUrl).toBe(mockResult.streamUrl);
      expect(data.data.track.id).toBe("1894215");
      expect(response.headers.get("Cache-Control")).toBe("no-store, no-cache, must-revalidate, private");
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("propagates 403 Forbidden when track has an unverified CC license", async () => {
      resolveJamendoTrackStreamMock.mockRejectedValueOnce(
        new JamendoError(
          'Playback unavailable: track "Unverified Track" has an unverified or unrecognized license (Unknown License)',
          "API_ERROR",
          403
        )
      );

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=999");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toContain("unverified or unrecognized license");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });

    it("propagates 404 Not Found when track does not exist", async () => {
      resolveJamendoTrackStreamMock.mockRejectedValueOnce(
        new JamendoError("Track with ID 999999 was not found on Jamendo", "API_ERROR", 404)
      );

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=999999");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain("not found on Jamendo");
    });

    it("propagates 429 Rate Limited when Jamendo rate limit is reached", async () => {
      resolveJamendoTrackStreamMock.mockRejectedValueOnce(
        new JamendoError("Rate limit exceeded", "RATE_LIMITED", 429)
      );

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=123");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
    });

    it("handles unexpected server exceptions with HTTP 500", async () => {
      resolveJamendoTrackStreamMock.mockRejectedValueOnce(new Error("Unexpected crash"));

      const request = new Request("http://localhost:3000/api/music/stream-url?trackId=123");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain("unexpected error");
    });
  });
});
