import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { LogoutButton } from "@/components/auth/logout-button";

describe("LogoutButton Component", () => {
  it("renders an accessible sign-out button with icon and label", () => {
    const html = renderToString(React.createElement(LogoutButton, {}));

    expect(html).toContain('aria-label="Sign out of Harmoni"');
    expect(html).toContain("Sign Out");
    expect(html).toContain("<svg");
    expect(html).toContain('type="button"');
  });

  it("supports nav variant styling for top navigation bar", () => {
    const html = renderToString(React.createElement(LogoutButton, { variant: "nav" }));

    expect(html).toContain("Sign Out");
    expect(html).toContain("text-muted-foreground");
  });
});
