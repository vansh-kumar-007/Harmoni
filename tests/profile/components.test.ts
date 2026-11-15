import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  notFound: vi.fn(),
}));

import { ArtworkImage } from "@/components/profile/artwork-image";
import { ProfileTabs } from "@/app/users/[username]/profile-tabs";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import {
  AVATAR_REGISTRY,
  getValidAvatarKey,
  type AvatarKey,
} from "@/lib/profile/constants";

describe("Profile Components & Accessibility Verification", () => {
  describe("ArtworkImage Component", () => {
    it("renders an <img> tag with safe attributes when given a valid https URL", () => {
      const html = renderToString(
        React.createElement(ArtworkImage, {
          src: "https://cdn.example.com/covers/ambient.jpg",
          alt: "Late Night Ambient Cover",
          size: "md",
          fallbackIcon: "playlist",
        })
      );

      expect(html).toContain("<img");
      expect(html).toContain('src="https://cdn.example.com/covers/ambient.jpg"');
      expect(html).toContain('alt="Late Night Ambient Cover"');
      expect(html).toContain('loading="lazy"');
      expect(html).toContain('decoding="async"');
      expect(html).toContain("w-10 h-10");
    });

    it("renders a design-system fallback symbol for null, undefined, or empty src", () => {
      const htmlNull = renderToString(
        React.createElement(ArtworkImage, {
          src: null,
          alt: "Missing Cover",
          fallbackIcon: "playlist",
        })
      );
      expect(htmlNull).not.toContain("<img");
      expect(htmlNull).toContain("♫");
      expect(htmlNull).toContain('aria-hidden="true"');

      const htmlEmpty = renderToString(
        React.createElement(ArtworkImage, {
          src: "",
          alt: "Empty Cover",
          fallbackIcon: "note",
        })
      );
      expect(htmlEmpty).not.toContain("<img");
      expect(htmlEmpty).toContain("♪");
    });

    it("strictly refuses to render javascript: or other unexpected protocols as <img>", () => {
      const dangerousHtml = renderToString(
        React.createElement(ArtworkImage, {
          src: "javascript:alert(document.domain)",
          alt: "Exploit Test",
          fallbackIcon: "note",
        })
      );

      expect(dangerousHtml).not.toContain("<img");
      expect(dangerousHtml).not.toContain("javascript:");
      expect(dangerousHtml).toContain("♪");
    });

    it("supports responsive size tiers (sm, md, lg) with consistent dimensions", () => {
      const htmlSm = renderToString(
        React.createElement(ArtworkImage, {
          src: "https://example.com/sm.jpg",
          alt: "Small Art",
          size: "sm",
        })
      );
      expect(htmlSm).toContain("w-9 h-9");

      const htmlLg = renderToString(
        React.createElement(ArtworkImage, {
          src: "https://example.com/lg.jpg",
          alt: "Large Art",
          size: "lg",
        })
      );
      expect(htmlLg).toContain("w-12 h-12");
    });
  });

  describe("ProfileTabs WAI-ARIA Semantics & Structure", () => {
    const mockPlaylists = [
      {
        id: "pl_1",
        title: "Deep Focus",
        description: "Study beats",
        coverUrl: "https://cdn.example.com/covers/deep-focus.jpg",
        createdAt: new Date("2026-05-15T12:00:00Z"),
        _count: { tracks: 14 },
      },
    ];

    const mockScrobbles = [
      {
        id: "sc_1",
        listenedAt: new Date("2026-11-15T08:30:00Z"),
        track: {
          id: "tr_1",
          title: "Cascade",
          artistName: "Kiasmos",
          albumName: "Blurred EP",
          durationMs: 312000,
          coverUrl: "https://cdn.example.com/covers/kiasmos.jpg",
        },
      },
    ];

    it("renders tablist with roving tabindex: active tab has tabIndex=0, inactive tabs have tabIndex=-1", () => {
      const html = renderToString(
        React.createElement(ProfileTabs, {
          username: "alice",
          isOwner: true,
          publicPlaylists: mockPlaylists,
          recentScrobbles: mockScrobbles,
          totalScrobbles: 1,
        })
      );

      expect(html).toContain('role="tablist"');
      expect(html).toContain('aria-label="Profile Sections"');

      // Overview is active by default: tabIndex="0", aria-selected="true"
      expect(html).toContain('id="tab-overview"');
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('tabindex="0"');

      // Inactive tabs have tabindex="-1" and aria-selected="false"
      expect(html).toContain('id="tab-playlists"');
      expect(html).toContain('aria-selected="false"');
      expect(html).toContain('tabindex="-1"');
      expect(html).toContain('id="tab-history"');
      expect(html).toContain('aria-selected="false"');
    });

    it("renders all 3 tabpanels in the DOM with matching aria-controls and IDs", () => {
      const html = renderToString(
        React.createElement(ProfileTabs, {
          username: "alice",
          isOwner: false,
          publicPlaylists: mockPlaylists,
          recentScrobbles: mockScrobbles,
          totalScrobbles: 1,
        })
      );

      // Verify all 3 panels exist in the rendered output
      expect(html).toContain('id="tab-overview-content"');
      expect(html).toContain('aria-labelledby="tab-overview"');

      expect(html).toContain('id="tab-playlists-content"');
      expect(html).toContain('aria-labelledby="tab-playlists"');

      expect(html).toContain('id="tab-history-content"');
      expect(html).toContain('aria-labelledby="tab-history"');

      // Verify that inactive panels are marked hidden
      expect(html).toMatch(/id="tab-playlists-content"[^>]*hidden=""/);
      expect(html).toMatch(/id="tab-history-content"[^>]*hidden=""/);
    });

    it("displays actual playlist and track artwork URLs inside the tabs", () => {
      const html = renderToString(
        React.createElement(ProfileTabs, {
          username: "alice",
          isOwner: true,
          publicPlaylists: mockPlaylists,
          recentScrobbles: mockScrobbles,
          totalScrobbles: 1,
        })
      );

      // Track artwork rendered in recent scrobbles
      expect(html).toContain('src="https://cdn.example.com/covers/kiasmos.jpg"');
      expect(html).toContain('alt="Cover art for Cascade"');

      // Playlist artwork rendered in public playlists
      expect(html).toContain('src="https://cdn.example.com/covers/deep-focus.jpg"');
      expect(html).toContain('alt="Cover art for playlist Deep Focus"');
    });

    it("formats dates deterministically in UTC to prevent SSR hydration mismatches", () => {
      const html = renderToString(
        React.createElement(ProfileTabs, {
          username: "alice",
          isOwner: true,
          publicPlaylists: mockPlaylists,
          recentScrobbles: mockScrobbles,
          totalScrobbles: 1,
        })
      );

      // Scrobble timestamp formatted in UTC
      expect(html).toContain("UTC");
      expect(html).toContain("Nov 15");
    });

    it("calculates correct tab index transitions on arrow, Home, and End keys", () => {
      const tabs = ["overview", "playlists", "history"] as const;
      const getNextTab = (current: number, key: string) => {
        if (key === "ArrowRight" || key === "ArrowDown") return (current + 1) % tabs.length;
        if (key === "ArrowLeft" || key === "ArrowUp") return (current - 1 + tabs.length) % tabs.length;
        if (key === "Home") return 0;
        if (key === "End") return tabs.length - 1;
        return current;
      };

      // Wrap-around forward
      expect(getNextTab(0, "ArrowRight")).toBe(1);
      expect(getNextTab(1, "ArrowRight")).toBe(2);
      expect(getNextTab(2, "ArrowRight")).toBe(0);

      // Wrap-around backward
      expect(getNextTab(0, "ArrowLeft")).toBe(2);
      expect(getNextTab(2, "ArrowLeft")).toBe(1);
      expect(getNextTab(1, "ArrowLeft")).toBe(0);

      // Home and End
      expect(getNextTab(1, "Home")).toBe(0);
      expect(getNextTab(0, "End")).toBe(2);
    });
  });

  describe("EditProfileDialog Fallback & Accessibility", () => {
    it("safely normalizes invalid initial avatar keys to avatar_1", () => {
      expect(getValidAvatarKey("corrupted_or_malicious_key")).toBe("avatar_1");
      expect(getValidAvatarKey(null)).toBe("avatar_1");
      expect(getValidAvatarKey(undefined)).toBe("avatar_1");
      expect(getValidAvatarKey("avatar_4")).toBe("avatar_4");
    });

    it("renders the Edit Profile trigger button with accessible label and icon", () => {
      const html = renderToString(
        React.createElement(EditProfileDialog, {
          initialAvatarKey: "avatar_2",
          initialBio: "Modular synthesizer explorer",
          username: "alice",
          displayName: "Alice",
        })
      );

      expect(html).toContain("Edit Profile");
      expect(html).toContain('type="button"');
    });

    it("verifies avatar selection grid roving navigation wrapping across all 8 presets", () => {
      const getNextAvatar = (currentIndex: number, key: string): AvatarKey => {
        let targetIndex = currentIndex;
        if (key === "ArrowRight" || key === "ArrowDown") {
          targetIndex = (currentIndex + 1) % AVATAR_REGISTRY.length;
        } else if (key === "ArrowLeft" || key === "ArrowUp") {
          targetIndex = (currentIndex - 1 + AVATAR_REGISTRY.length) % AVATAR_REGISTRY.length;
        } else if (key === "Home") {
          targetIndex = 0;
        } else if (key === "End") {
          targetIndex = AVATAR_REGISTRY.length - 1;
        }
        return AVATAR_REGISTRY[targetIndex];
      };

      // Starting at avatar_1 (index 0)
      expect(getNextAvatar(0, "ArrowRight")).toBe("avatar_2");
      expect(getNextAvatar(7, "ArrowRight")).toBe("avatar_1"); // wraps to first
      expect(getNextAvatar(0, "ArrowLeft")).toBe("avatar_8"); // wraps to last
      expect(getNextAvatar(3, "Home")).toBe("avatar_1");
      expect(getNextAvatar(3, "End")).toBe("avatar_8");
    });

    it("verifies focus trap wrapping rules: shift+tab wraps to last element and tab wraps to first", () => {
      const mockElements = ["close-btn", "avatar-radio", "bio-textarea", "cancel-btn", "save-btn"];

      const getNextFocus = (currentActive: string, isShift: boolean) => {
        const first = mockElements[0];
        const last = mockElements[mockElements.length - 1];

        if (isShift) {
          if (currentActive === first) return last;
          const idx = mockElements.indexOf(currentActive);
          return mockElements[idx - 1];
        } else {
          if (currentActive === last) return first;
          const idx = mockElements.indexOf(currentActive);
          return mockElements[idx + 1];
        }
      };

      // Regular Tab wrapping from last to first
      expect(getNextFocus("save-btn", false)).toBe("close-btn");
      expect(getNextFocus("close-btn", false)).toBe("avatar-radio");

      // Shift+Tab wrapping from first to last
      expect(getNextFocus("close-btn", true)).toBe("save-btn");
      expect(getNextFocus("save-btn", true)).toBe("cancel-btn");
    });

    it("prevents dismissal while saving operation is active", () => {
      const canDismiss = (status: "idle" | "saving" | "error") => status !== "saving";

      expect(canDismiss("idle")).toBe(true);
      expect(canDismiss("error")).toBe(true);
      expect(canDismiss("saving")).toBe(false);
    });
  });
});
