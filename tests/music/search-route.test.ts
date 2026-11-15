import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const getCurrentUserMock = vi.fn();
const searchTracksMock = vi.fn();
const searchArtistsMock = vi.fn();
const searchAlbumsMock = vi.fn();
const isConfiguredMock = vi.fn();

vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

vi.mock("@/lib/music/providers/jamendo", () => ({
  searchJamendoTracks: (...args: unknown[]) => searchTracksMock(...args),
  searchJamendoArtists: (...args: unknown[]) => searchArtistsMock(...args),
  searchJamendoAlbums: (...args: unknown[]) => searchAlbumsMock(...args),
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

import { GET } from "@/app/api/music/search/route";
import { JamendoError } from "@/lib/music/providers/jamendo";

describe("Protected Music Search Route (GET /api/music/search)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isConfiguredMock.mockReturnValue(true);
    getCurrentUserMock.mockResolvedValue({
      id: "u_test_search",
      username: "searcher",
      displayName: "Searcher",
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

      const request = new Request("http://localhost:3000/api/music/search?q=ambient");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Authentication required");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });
  });

  describe("Query Parameter Validation", () => {
    it("returns 400 Bad Request when query parameter 'q' is missing", async () => {
      const request = new Request("http://localhost:3000/api/music/search");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/q/i);
    });

    it("returns 400 Bad Request when query parameter 'q' is empty whitespace", async () => {
      const request = new Request("http://localhost:3000/api/music/search?q=%20%20%20");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("cannot be empty");
    });

    it("returns 400 Bad Request when query parameter 'q' exceeds 100 characters", async () => {
      const longQuery = "a".repeat(101);
      const request = new Request(`http://localhost:3000/api/music/search?q=${longQuery}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("must not exceed 100 characters");
    });

    it("returns 400 Bad Request when search type is invalid", async () => {
      const request = new Request("http://localhost:3000/api/music/search?q=jazz&type=podcasts");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("Provider Configuration Guard", () => {
    it("returns 503 Service Unavailable when Jamendo provider is not configured", async () => {
      isConfiguredMock.mockReturnValue(false);

      const request = new Request("http://localhost:3000/api/music/search?q=synthwave");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.configured).toBe(false);
      expect(data.error).toContain("Jamendo music provider is not configured");
      expect(searchTracksMock).not.toHaveBeenCalled();
    });
  });

  describe("Dispatch & Successful Responses", () => {
    it("dispatches to searchJamendoTracks for type=tracks (or default)", async () => {
      const mockResult = {
        type: "tracks",
        query: "lofi",
        offset: 0,
        limit: 20,
        totalCount: 50,
        hasMore: true,
        items: [
          {
            id: "101",
            provider: "JAMENDO",
            title: "Chill Morning",
            artistId: "201",
            artistName: "Lofi Cafe",
            albumId: null,
            albumTitle: null,
            durationSeconds: 150,
            durationFormatted: "2:30",
            coverUrl: "https://usercontent.jamendo.com/cover.jpg",
            jamendoUrl: "https://www.jamendo.com/track/101",
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
        ],
      };

      searchTracksMock.mockResolvedValueOnce(mockResult);

      const request = new Request("http://localhost:3000/api/music/search?q=lofi&limit=20&offset=0");
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("tracks");
      expect(json.data.items).toHaveLength(1);
      expect(json.data.items[0].title).toBe("Chill Morning");

      // Verify no-store caching headers
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(searchTracksMock).toHaveBeenCalledWith({ query: "lofi", limit: 20, offset: 0 });
    });

    it("dispatches to searchJamendoArtists for type=artists", async () => {
      const mockResult = {
        type: "artists",
        query: "Solar",
        offset: 0,
        limit: 10,
        totalCount: 5,
        hasMore: false,
        items: [
          {
            id: "301",
            provider: "JAMENDO",
            name: "Solar Fields",
            imageUrl: "https://usercontent.jamendo.com/artist.jpg",
            website: null,
            joinDate: "2015-05-10",
            jamendoUrl: "https://www.jamendo.com/artist/301",
          },
        ],
      };

      searchArtistsMock.mockResolvedValueOnce(mockResult);

      const request = new Request("http://localhost:3000/api/music/search?q=Solar&type=artists&limit=10");
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("artists");
      expect(searchArtistsMock).toHaveBeenCalledWith({ query: "Solar", limit: 10, offset: 0 });
    });

    it("dispatches to searchJamendoAlbums for type=albums", async () => {
      const mockResult = {
        type: "albums",
        query: "Genesis",
        offset: 0,
        limit: 10,
        totalCount: 3,
        hasMore: false,
        items: [
          {
            id: "401",
            provider: "JAMENDO",
            title: "Genesis Album",
            artistId: "301",
            artistName: "Solar Fields",
            coverUrl: "https://usercontent.jamendo.com/album.jpg",
            releaseDate: "2019-10-01",
            jamendoUrl: "https://www.jamendo.com/list/a401",
          },
        ],
      };

      searchAlbumsMock.mockResolvedValueOnce(mockResult);

      const request = new Request("http://localhost:3000/api/music/search?q=Genesis&type=albums&limit=10");
      const response = await GET(request);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("albums");
      expect(searchAlbumsMock).toHaveBeenCalledWith({ query: "Genesis", limit: 10, offset: 0 });
    });
  });

  describe("Safe Error Handling", () => {
    it("safely maps upstream JamendoError into appropriate status without leaking internal secrets", async () => {
      searchTracksMock.mockRejectedValueOnce(
        new JamendoError("Jamendo API rate limit exceeded. Please try again shortly.", "RATE_LIMITED", 429)
      );

      const request = new Request("http://localhost:3000/api/music/search?q=overload");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toContain("rate limit exceeded");
      expect(response.headers.get("Cache-Control")).toContain("no-store");
    });
  });
});
