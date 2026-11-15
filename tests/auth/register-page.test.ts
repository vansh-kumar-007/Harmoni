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

import RegisterPage from "@/app/register/page";
import { RegisterForm } from "@/app/register/register-form";

describe("Registration Page & Form Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("RegisterPage Server Component", () => {
    it("redirects authenticated users to home", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_1",
        username: "alice",
        displayName: "Alice",
        role: "USER",
      });

      await expect(
        RegisterPage({ searchParams: Promise.resolve({}) })
      ).rejects.toThrow("NEXT_REDIRECT");

      expect(redirectMock).toHaveBeenCalledWith("/");
    });

    it("renders the registration form for unauthenticated visitors", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      const page = await RegisterPage({ searchParams: Promise.resolve({}) });
      const html = renderToString(page);

      expect(html).toContain("Join Harmoni");
      expect(html).toContain("Create your private circle account with an invitation code");
      expect(html).toContain('name="inviteCode"');
      expect(html).toContain('name="username"');
      expect(html).toContain('name="displayName"');
      expect(html).toContain('name="password"');
      expect(html).toContain('name="confirmPassword"');
    });

    it("passes prefilled invitation code query param to the form", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      const code = "0123456789abcdef0123456789abcdef";
      const page = await RegisterPage({
        searchParams: Promise.resolve({ code }),
      });
      const html = renderToString(page);

      expect(html).toContain(`value="${code}"`);
    });
  });

  describe("RegisterForm UI & Accessibility Structure", () => {
    it("renders required fields with proper autocomplete and accessible attributes", () => {
      const html = renderToString(React.createElement(RegisterForm, {}));

      // Invitation code
      expect(html).toContain('id="register-invite-code"');
      expect(html).toContain("Invitation Code");

      // Username & Display Name
      expect(html).toContain('id="register-username"');
      expect(html).toMatch(/autoComplete="username"/i);
      expect(html).toContain('id="register-display-name"');
      expect(html).toMatch(/autoComplete="name"/i);

      // Password & Confirmation
      expect(html).toContain('id="register-password"');
      expect(html).toMatch(/autoComplete="new-password"/i);
      expect(html).toContain('id="register-confirm-password"');

      // Submit button
      expect(html).toContain("Complete Registration");

      // Sign In link
      expect(html).toContain('href="/login"');
      expect(html).toContain("Sign in");
    });
  });
});
