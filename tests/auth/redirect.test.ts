import { describe, it, expect } from "vitest";
import { getSafeRedirectUrl } from "@/lib/auth/redirect";

describe("Safe Redirect URL Validation", () => {
  it("accepts valid same-origin relative paths", () => {
    expect(getSafeRedirectUrl("/")).toBe("/");
    expect(getSafeRedirectUrl("/settings/appearance")).toBe("/settings/appearance");
    expect(getSafeRedirectUrl("/@alice")).toBe("/@alice");
    expect(getSafeRedirectUrl("/admin/invitations")).toBe("/admin/invitations");
    expect(getSafeRedirectUrl("/users/bob?tab=history")).toBe("/users/bob?tab=history");
  });

  it("strictly rejects protocol-relative URLs (open redirect vector)", () => {
    expect(getSafeRedirectUrl("//evil.com")).toBe("/");
    expect(getSafeRedirectUrl("//evil.com/phish")).toBe("/");
    expect(getSafeRedirectUrl("///evil.com")).toBe("/");
    expect(getSafeRedirectUrl("//attacker.com:8080/")).toBe("/");
  });

  it("strictly rejects external URLs with protocols", () => {
    expect(getSafeRedirectUrl("https://evil.com")).toBe("/");
    expect(getSafeRedirectUrl("http://evil.com/login")).toBe("/");
    expect(getSafeRedirectUrl("javascript:alert(1)")).toBe("/");
    expect(getSafeRedirectUrl("data:text/html,evil")).toBe("/");
  });

  it("strictly rejects Windows backslash tricks", () => {
    expect(getSafeRedirectUrl("/\\evil.com")).toBe("/");
    expect(getSafeRedirectUrl("/\\/evil.com")).toBe("/");
  });

  it("rejects non-string, empty, or whitespace inputs and uses provided fallback", () => {
    expect(getSafeRedirectUrl(null, "/fallback")).toBe("/fallback");
    expect(getSafeRedirectUrl(undefined, "/fallback")).toBe("/fallback");
    expect(getSafeRedirectUrl("", "/fallback")).toBe("/fallback");
    expect(getSafeRedirectUrl("   ", "/fallback")).toBe("/fallback");
    expect(getSafeRedirectUrl(12345, "/fallback")).toBe("/fallback");
  });

  it("rejects URLs containing control characters or newlines", () => {
    expect(getSafeRedirectUrl("/path\nwith\rnewline")).toBe("/");
    expect(getSafeRedirectUrl("/path\u0000null")).toBe("/");
  });
});
