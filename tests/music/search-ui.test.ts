import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { SearchView } from "@/app/search/search-view";
import { TrackCard } from "@/components/music/track-card";
import { ArtistCard } from "@/components/music/artist-card";
import { AlbumCard } from "@/components/music/album-card";
import { LicenseBadge } from "@/components/music/license-badge";
import type { NormalizedTrack, NormalizedArtist, NormalizedAlbum, LicenseInfo } from "@/lib/music/types";

describe("Search UI & Music Card Components", () => {
  describe("SearchView Server Rendering", () => {
    it("renders initial idle state with search input, suggestion pills, and categories when configured", () => {
      const html = renderToString(React.createElement(SearchView, { isConfigured: true }));

      expect(html).toContain("Discover Music");
      expect(html).toContain("Search by title, artist, album, or genre...");
      expect(html).toContain("Suggestions:");
      expect(html).toContain("Ambient");
      expect(html).toContain("Jazz");
      expect(html).toContain('role="tablist"');
      expect(html).toContain("Tracks");
      expect(html).toContain("Artists");
      expect(html).toContain("Albums");
      expect(html).toContain("Ready to Discover Music");
      expect(html).not.toContain("Jamendo API Not Configured");
    });

    it("renders friendly configuration instructions when isConfigured is false", () => {
      const html = renderToString(React.createElement(SearchView, { isConfigured: false }));

      expect(html).toContain("Jamendo API Not Configured");
      expect(html).toContain("developer.jamendo.com");
      expect(html).toContain("JAMENDO_CLIENT_ID=");
      expect(html).toContain(".env.local");
    });
  });

  describe("LicenseBadge Component", () => {
    it("renders verified Creative Commons badge with link and permission tags", () => {
      const verifiedLicense: LicenseInfo = {
        code: "CC BY-NC-SA 3.0",
        name: "Creative Commons Attribution-NonCommercial-ShareAlike 3.0",
        url: "https://creativecommons.org/licenses/by-nc-sa/3.0/",
        isCreativeCommons: true,
        isVerified: true,
        nonCommercial: true,
        shareAlike: true,
        noDerivatives: false,
      };

      const html = renderToString(React.createElement(LicenseBadge, { license: verifiedLicense }));

      expect(html).toContain("CC BY-NC-SA 3.0");
      expect(html).toContain('href="https://creativecommons.org/licenses/by-nc-sa/3.0/"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain("NC");
      expect(html).toContain("SA");
      expect(html).not.toContain("ND");
    });

    it("renders unknown license badge without external link when unverified", () => {
      const unverifiedLicense: LicenseInfo = {
        code: "Unknown License",
        name: "Unspecified or Unknown License",
        url: null,
        isCreativeCommons: false,
        isVerified: false,
        nonCommercial: false,
        shareAlike: false,
        noDerivatives: false,
      };

      const html = renderToString(React.createElement(LicenseBadge, { license: unverifiedLicense }));

      expect(html).toContain("Unknown License");
      expect(html).not.toContain("<a");
    });
  });

  describe("TrackCard Component", () => {
    it("renders track metadata, CC license badge, and Jamendo backlink", () => {
      const track: NormalizedTrack = {
        id: "1001",
        provider: "JAMENDO",
        title: "Echoes of Silence",
        artistId: "2002",
        artistName: "Aura Sound",
        albumId: "3003",
        albumTitle: "Atmospheres Vol. 1",
        durationSeconds: 245,
        durationFormatted: "4:05",
        coverUrl: "https://usercontent.jamendo.com/cover1001.jpg",
        jamendoUrl: "https://www.jamendo.com/track/1001",
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
      };

      const html = renderToString(React.createElement(TrackCard, { track }));

      expect(html).toContain("Echoes of Silence");
      expect(html).toContain("Aura Sound");
      expect(html).toContain("Atmospheres Vol. 1");
      expect(html).toContain("4:05");
      expect(html).toContain('src="https://usercontent.jamendo.com/cover1001.jpg"');
      expect(html).toContain("CC BY 4.0");
      expect(html).toContain('href="https://www.jamendo.com/track/1001"');
      expect(html).toContain("Jamendo");
    });

    it("renders single badge when album title is absent", () => {
      const track: NormalizedTrack = {
        id: "1002",
        provider: "JAMENDO",
        title: "Deep Focus",
        artistId: "2002",
        artistName: "Aura Sound",
        albumId: null,
        albumTitle: null,
        durationSeconds: 180,
        durationFormatted: "3:00",
        coverUrl: null,
        jamendoUrl: "https://www.jamendo.com/track/1002",
        license: {
          code: "CC BY 3.0",
          name: "Creative Commons Attribution 3.0",
          url: "https://creativecommons.org/licenses/by/3.0/",
          isCreativeCommons: true,
          isVerified: true,
          nonCommercial: false,
          shareAlike: false,
          noDerivatives: false,
        },
      };

      const html = renderToString(React.createElement(TrackCard, { track }));

      expect(html).toContain("Single");
      expect(html).toContain("♫"); // Fallback icon when coverUrl is null
    });
  });

  describe("ArtistCard Component", () => {
    it("renders artist details and Jamendo Profile backlink", () => {
      const artist: NormalizedArtist = {
        id: "2002",
        provider: "JAMENDO",
        name: "Aura Sound",
        imageUrl: "https://usercontent.jamendo.com/artist.jpg",
        website: "https://aurasound.example.com",
        joinDate: "2018-04-12",
        jamendoUrl: "https://www.jamendo.com/artist/2002",
      };

      const html = renderToString(React.createElement(ArtistCard, { artist }));

      expect(html).toContain("Aura Sound");
      expect(html).toContain("Joined 2018");
      expect(html).toContain('href="https://aurasound.example.com"');
      expect(html).toContain('href="https://www.jamendo.com/artist/2002"');
      expect(html).toContain("Jamendo Profile");
    });
  });

  describe("AlbumCard Component", () => {
    it("renders album metadata and Jamendo Album backlink", () => {
      const album: NormalizedAlbum = {
        id: "3003",
        provider: "JAMENDO",
        title: "Atmospheres Vol. 1",
        artistId: "2002",
        artistName: "Aura Sound",
        coverUrl: "https://usercontent.jamendo.com/album.jpg",
        releaseDate: "2020-09-15",
        jamendoUrl: "https://www.jamendo.com/list/a3003",
      };

      const html = renderToString(React.createElement(AlbumCard, { album }));

      expect(html).toContain("Atmospheres Vol. 1");
      expect(html).toContain("Aura Sound");
      expect(html).toContain("2020");
      expect(html).toContain('href="https://www.jamendo.com/list/a3003"');
      expect(html).toContain("Jamendo Album");
    });
  });
});
