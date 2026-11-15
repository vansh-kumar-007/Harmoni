import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

const redirectMock = vi.fn();
const getCurrentUserMock = vi.fn();

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    redirectMock(url);
    const err = new Error("NEXT_REDIRECT");
    (err as unknown as { digest: string }).digest = "NEXT_REDIRECT";
    throw err;
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/lib/auth/dal", () => ({
  getCurrentUser: () => getCurrentUserMock(),
}));

import LoginPage from "@/app/login/page";
import { LoginForm } from "@/app/login/login-form";

describe("Login Page & Form Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("LoginPage Server Component", () => {
    it("redirects authenticated users to home when no returnTo param is provided", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_1",
        username: "alice",
        displayName: "Alice",
        role: "USER",
      });

      await expect(
        LoginPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("redirects authenticated users to safe returnTo destination", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_1",
        username: "alice",
        displayName: "Alice",
        role: "USER",
      });

      await expect(
        LoginPage({ searchParams: Promise.resolve({ returnTo: "/settings/appearance" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(redirectMock).toHaveBeenCalledWith("/settings/appearance");
    });

    it("neutralizes open redirect returnTo targets and falls back to home", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_1",
        username: "alice",
        displayName: "Alice",
        role: "USER",
      });

      await expect(
        LoginPage({ searchParams: Promise.resolve({ returnTo: "https://evil.com/phish" }) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("renders the login form when the user is unauthenticated", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      const page = await LoginPage({ searchParams: Promise.resolve({}) });
      const html = renderToString(page);

      expect(html).toContain("Welcome to Harmoni");
      expect(html).toContain("Sign in to your private circle account");
      expect(html).toContain('name="username"');
      expect(html).toContain('name="password"');
    });
  });

  describe("LoginForm UI & Accessibility Structure", () => {
    it("renders accessible username and password inputs with correct autocomplete", () => {
      const html = renderToString(React.createElement(LoginForm, { returnTo: "/" }));

      // Username input
      expect(html).toContain('id="login-username"');
      expect(html).toMatch(/autoComplete="username"/i);
      expect(html).toContain('placeholder="e.g. alex"');

      // Password input and toggle
      expect(html).toContain('id="login-password"');
      expect(html).toMatch(/autoComplete="current-password"/i);
      expect(html).toContain('aria-label="Show password"');

      // Submit button
      expect(html).toContain('type="submit"');
      expect(html).toContain("Sign In");

      // Register link
      expect(html).toContain('href="/register"');
      expect(html).toContain("Join with Invite");
    });
  });
});
