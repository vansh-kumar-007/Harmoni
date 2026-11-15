import { describe, it, expect } from "vitest";
import { parseCcLicense, formatDuration } from "@/lib/music/licenses";

describe("Music Licensing & Duration Utilities", () => {
  describe("formatDuration", () => {
    it("formats standard minute and second durations correctly", () => {
      expect(formatDuration(0)).toBe("0:00");
      expect(formatDuration(5)).toBe("0:05");
      expect(formatDuration(59)).toBe("0:59");
      expect(formatDuration(60)).toBe("1:00");
      expect(formatDuration(65)).toBe("1:05");
      expect(formatDuration(272)).toBe("4:32");
    });

    it("formats durations longer than one hour correctly", () => {
      expect(formatDuration(3600)).toBe("1:00:00");
      expect(formatDuration(3665)).toBe("1:01:05");
      expect(formatDuration(7322)).toBe("2:02:02");
    });

    it("handles negative or non-finite inputs gracefully", () => {
      expect(formatDuration(-10)).toBe("0:00");
      expect(formatDuration(NaN)).toBe("0:00");
      expect(formatDuration(Infinity)).toBe("0:00");
    });
  });

  describe("parseCcLicense", () => {
    it("parses CC BY-NC-SA 3.0 license URL correctly", () => {
      const license = parseCcLicense("http://creativecommons.org/licenses/by-nc-sa/3.0/");

      expect(license.isCreativeCommons).toBe(true);
      expect(license.isVerified).toBe(true);
      expect(license.code).toBe("CC BY-NC-SA 3.0");
      expect(license.name).toBe("Creative Commons Attribution-NonCommercial-ShareAlike 3.0");
      expect(license.url).toBe("https://creativecommons.org/licenses/by-nc-sa/3.0/");
      expect(license.nonCommercial).toBe(true);
      expect(license.shareAlike).toBe(true);
      expect(license.noDerivatives).toBe(false);
    });

    it("parses CC BY 4.0 license URL correctly", () => {
      const license = parseCcLicense("https://creativecommons.org/licenses/by/4.0/");

      expect(license.isCreativeCommons).toBe(true);
      expect(license.isVerified).toBe(true);
      expect(license.code).toBe("CC BY 4.0");
      expect(license.name).toBe("Creative Commons Attribution 4.0");
      expect(license.nonCommercial).toBe(false);
      expect(license.shareAlike).toBe(false);
      expect(license.noDerivatives).toBe(false);
    });

    it("parses CC BY-ND 3.0 license URL correctly", () => {
      const license = parseCcLicense("http://creativecommons.org/licenses/by-nd/3.0/");

      expect(license.isCreativeCommons).toBe(true);
      expect(license.isVerified).toBe(true);
      expect(license.code).toBe("CC BY-ND 3.0");
      expect(license.noDerivatives).toBe(true);
      expect(license.nonCommercial).toBe(false);
      expect(license.shareAlike).toBe(false);
    });

    it("parses CC0 public domain dedication correctly", () => {
      const license = parseCcLicense("http://creativecommons.org/publicdomain/zero/1.0/");

      expect(license.isCreativeCommons).toBe(true);
      expect(license.isVerified).toBe(true);
      expect(license.code).toBe("CC0 1.0");
      expect(license.name).toBe("Creative Commons CC0 1.0 Public Domain Dedication");
      expect(license.nonCommercial).toBe(false);
      expect(license.shareAlike).toBe(false);
      expect(license.noDerivatives).toBe(false);
    });

    it("falls back gracefully on unknown, missing, or malformed license URLs", () => {
      const unknown1 = parseCcLicense(null);
      expect(unknown1.isVerified).toBe(false);
      expect(unknown1.isCreativeCommons).toBe(false);
      expect(unknown1.code).toBe("Unknown License");
      expect(unknown1.url).toBeNull();

      const unknown2 = parseCcLicense("https://evil.com/fake-license");
      expect(unknown2.isVerified).toBe(false);
      expect(unknown2.code).toBe("Unknown License");

      const unknown3 = parseCcLicense("javascript:alert(1)");
      expect(unknown3.isVerified).toBe(false);
      expect(unknown3.code).toBe("Unknown License");

      const unknown4 = parseCcLicense("not a url");
      expect(unknown4.isVerified).toBe(false);
      expect(unknown4.code).toBe("Unknown License");
    });

    it("incorporates raw Jamendo licenses object flags when available", () => {
      const license = parseCcLicense("https://creativecommons.org/licenses/by/3.0/", {
        ccnc: "true",
        ccsa: "true",
        ccnd: "false",
      });

      expect(license.isVerified).toBe(true);
      expect(license.nonCommercial).toBe(true);
      expect(license.shareAlike).toBe(true);
      expect(license.noDerivatives).toBe(false);
    });
  });
});
