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

import AdminInvitationsPage from "@/app/admin/invitations/page";
import { InviteGenerator } from "@/app/admin/invitations/invite-generator";

describe("Administrator Invitations Page & Generator Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("AdminInvitationsPage Authorization Guard", () => {
    it("redirects unauthenticated visitors to login with returnTo param", async () => {
      getCurrentUserMock.mockResolvedValueOnce(null);

      await expect(AdminInvitationsPage()).rejects.toThrow("NEXT_REDIRECT");
      expect(redirectMock).toHaveBeenCalledWith("/login?returnTo=/admin/invitations");
    });

    it("rejects non-admin authenticated users with a 403 Forbidden screen", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_standard",
        username: "bob",
        displayName: "Bob",
        role: "USER",
      });

      const page = await AdminInvitationsPage();
      const html = renderToString(page);

      expect(html).toContain("Administrative Access Required");
      expect(html).toContain("Only users with the administrator role can access invitation management");
      expect(html).toContain("Return to Home");
      expect(html).not.toContain("Generate Member Invitation");
    });

    it("grants access to authenticated administrators and renders generator", async () => {
      getCurrentUserMock.mockResolvedValueOnce({
        id: "u_admin",
        username: "admin_user",
        displayName: "Platform Admin",
        role: "ADMIN",
      });

      const page = await AdminInvitationsPage();
      const html = renderToString(page);

      expect(html).toContain("ADMIN ACCESS GRANTED");
      expect(html).toContain("Generate Member Invitation");
      expect(html).toContain("Harmoni Invitation Security Guarantees");
      expect(html).toContain("Single-Use Only");
      expect(html).toContain("Zero Plaintext Storage");
    });
  });

  describe("InviteGenerator Form & Accessibility", () => {
    it("renders expiration dropdown with valid 1 to 30 day options and default 7 days", () => {
      const html = renderToString(React.createElement(InviteGenerator, {}));

      expect(html).toContain('id="invite-expiration-select"');
      expect(html).toContain('value="7"');
      expect(html).toContain("1 Day (24 Hours)");
      expect(html).toContain("7 Days (Recommended Default)");
      expect(html).toContain("30 Days (Maximum Allowed)");
      expect(html).toContain("Generate 256-Bit Invitation Code");
    });
  });
});
