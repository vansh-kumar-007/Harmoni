import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const getCurrentUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

import HomePage from "@/app/page";
import { Navbar } from "@/components/layout/navbar";
import type { SafeUser } from "@/lib/auth/session";

describe("Home Page & Application Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("HomePage Session-Aware States", () => {
    it("renders unauthenticated landing page with branding and login/register links", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      const page = await HomePage();
      const html = renderToString(page);

      expect(html).toContain("Harmoni");
      expect(html).toContain("Private Social Music Circle");
      expect(html).toContain('href="/login"');
      expect(html).toContain("Sign In to Your Circle");
      expect(html).toContain('href="/register"');
      expect(html).toContain("Join with Invitation Code");
      expect(html).toContain("Legal CC Music Streaming");
      expect(html).toContain("Genuine Scrobbling");
      expect(html).toContain("Multi-Theme Aesthetics");
    });

    it("renders authenticated dashboard for a standard user and omits admin features", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_std",
        username: "maya",
        displayName: "Maya Lin",
        avatarKey: "avatar_2",
        bio: "Analog synth enthusiast",
        role: "USER",
        themeKey: "obsidian-studio",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });

      const page = await HomePage();
      const html = renderToString(page).replace(/<!-- -->/g, "");

      expect(html).toContain("Welcome back, Maya Lin");
      expect(html).toContain("@maya");
      expect(html).toContain("USER");
      expect(html).toContain("Analog synth enthusiast");
      expect(html).toContain('href="/@maya"');
      expect(html).toContain("Your Profile");
      expect(html).toContain('href="/settings/appearance"');
      expect(html).toContain("Appearance Settings");
      expect(html).toContain('href="/search"');
      expect(html).toContain("Discover Music");
      expect(html).toContain("Sign Out");

      // Standard user must NOT receive the admin invitation card
      expect(html).not.toContain("Member Invitations");
      expect(html).not.toContain('href="/admin/invitations"');
    });

    it("renders authenticated dashboard for an admin user with admin invitation card", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_adm",
        username: "system_admin",
        displayName: "Platform Admin",
        avatarKey: "avatar_1",
        bio: null,
        role: "ADMIN",
        themeKey: "nordic-aurora",
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });

      const page = await HomePage();
      const html = renderToString(page).replace(/<!-- -->/g, "");

      expect(html).toContain("Welcome back, Platform Admin");
      expect(html).toContain("@system_admin");
      expect(html).toContain("ADMIN");

      // Admin user must receive the member invitations card
      expect(html).toContain("Member Invitations");
      expect(html).toContain('href="/admin/invitations"');
    });
  });

  describe("Navbar Component Navigation Links", () => {
    it("renders sign in and register links for unauthenticated visitors", () => {
      const html = renderToString(React.createElement(Navbar, { user: null }));

      expect(html).toContain("Harmoni");
      expect(html).toContain('href="/login"');
      expect(html).toContain("Sign In");
      expect(html).toContain('href="/register"');
      expect(html).toContain("Join with Invite");
      expect(html).not.toContain("Sign Out");
    });

    it("renders user profile, appearance, and logout for authenticated members", () => {
      const mockUser: SafeUser = {
        id: "u_member",
        username: "elena",
        displayName: "Elena",
        avatarKey: "avatar_4",
        bio: null,
        role: "USER",
        themeKey: "obsidian-studio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const html = renderToString(React.createElement(Navbar, { user: mockUser }));

      expect(html).toContain('href="/@elena"');
      expect(html).toContain("@elena");
      expect(html).toContain('href="/settings/appearance"');
      expect(html).toContain("Theme");
      expect(html).toContain('href="/search"');
      expect(html).toContain("Search");
      expect(html).toContain("Sign Out");
      expect(html).not.toContain('href="/admin/invitations"');
    });

    it("renders admin invitations link for authenticated administrators", () => {
      const mockAdmin: SafeUser = {
        id: "u_admin",
        username: "elena_admin",
        displayName: "Elena Admin",
        avatarKey: "avatar_4",
        bio: null,
        role: "ADMIN",
        themeKey: "obsidian-studio",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const html = renderToString(React.createElement(Navbar, { user: mockAdmin }));

      expect(html).toContain('href="/admin/invitations"');
      expect(html).toContain("Invitations");
      expect(html).toContain("Sign Out");
    });
  });
});
