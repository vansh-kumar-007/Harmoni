import { describe, it, expect } from "vitest";
import { parseCcLicense, formatDuration, createUnknownLicense } from "@/lib/music/licenses";

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

  describe("parseCcLicense - Strict Creative Commons Validation", () => {
    describe("Explicitly Supported License Identifiers", () => {
      it("recognizes CC BY (Attribution)", () => {
        const license = parseCcLicense("https://creativecommons.org/licenses/by/4.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY 4.0");
        expect(license.name).toBe("Creative Commons Attribution 4.0");
        expect(license.url).toBe("https://creativecommons.org/licenses/by/4.0/");
        expect(license.nonCommercial).toBe(false);
        expect(license.shareAlike).toBe(false);
        expect(license.noDerivatives).toBe(false);
      });

      it("recognizes CC BY-SA (Attribution-ShareAlike)", () => {
        const license = parseCcLicense("http://creativecommons.org/licenses/by-sa/3.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY-SA 3.0");
        expect(license.name).toBe("Creative Commons Attribution-ShareAlike 3.0");
        expect(license.url).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
        expect(license.nonCommercial).toBe(false);
        expect(license.shareAlike).toBe(true);
        expect(license.noDerivatives).toBe(false);
      });

      it("recognizes CC BY-ND (Attribution-NoDerivatives)", () => {
        const license = parseCcLicense("https://creativecommons.org/licenses/by-nd/4.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY-ND 4.0");
        expect(license.name).toBe("Creative Commons Attribution-NoDerivatives 4.0");
        expect(license.nonCommercial).toBe(false);
        expect(license.shareAlike).toBe(false);
        expect(license.noDerivatives).toBe(true);
      });

      it("recognizes CC BY-NC (Attribution-NonCommercial)", () => {
        const license = parseCcLicense("https://creativecommons.org/licenses/by-nc/4.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY-NC 4.0");
        expect(license.name).toBe("Creative Commons Attribution-NonCommercial 4.0");
        expect(license.nonCommercial).toBe(true);
        expect(license.shareAlike).toBe(false);
        expect(license.noDerivatives).toBe(false);
      });

      it("recognizes CC BY-NC-SA (Attribution-NonCommercial-ShareAlike)", () => {
        const license = parseCcLicense("http://creativecommons.org/licenses/by-nc-sa/3.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY-NC-SA 3.0");
        expect(license.name).toBe("Creative Commons Attribution-NonCommercial-ShareAlike 3.0");
        expect(license.url).toBe("https://creativecommons.org/licenses/by-nc-sa/3.0/");
        expect(license.nonCommercial).toBe(true);
        expect(license.shareAlike).toBe(true);
        expect(license.noDerivatives).toBe(false);
      });

      it("recognizes CC BY-NC-ND (Attribution-NonCommercial-NoDerivatives)", () => {
        const license = parseCcLicense("https://creativecommons.org/licenses/by-nc-nd/2.5/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC BY-NC-ND 2.5");
        expect(license.name).toBe("Creative Commons Attribution-NonCommercial-NoDerivatives 2.5");
        expect(license.nonCommercial).toBe(true);
        expect(license.shareAlike).toBe(false);
        expect(license.noDerivatives).toBe(true);
      });

      it("recognizes CC0 (Public Domain Dedication)", () => {
        const license = parseCcLicense("http://creativecommons.org/publicdomain/zero/1.0/");
        expect(license.isVerified).toBe(true);
        expect(license.isCreativeCommons).toBe(true);
        expect(license.code).toBe("CC0 1.0");
        expect(license.name).toBe("Creative Commons CC0 1.0 Public Domain Dedication");
        expect(license.url).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
        expect(license.nonCommercial).toBe(false);
        expect(license.shareAlike).toBe(false);
        expect(license.noDerivatives).toBe(false);
      });
    });

    describe("Supported and Unsupported Versions", () => {
      it("accepts all officially published CC versions (1.0, 2.0, 2.5, 3.0, 4.0)", () => {
        const versions = ["1.0", "2.0", "2.5", "3.0", "4.0"];
        for (const ver of versions) {
          const lic = parseCcLicense(`https://creativecommons.org/licenses/by/${ver}/`);
          expect(lic.isVerified).toBe(true);
          expect(lic.code).toBe(`CC BY ${ver}`);
        }
      });

      it("rejects non-existent or unsupported CC versions", () => {
        const invalidVersions = ["0.5", "1.5", "3.5", "5.0", "99.0", "beta"];
        for (const ver of invalidVersions) {
          const lic = parseCcLicense(`https://creativecommons.org/licenses/by/${ver}/`);
          expect(lic.isVerified).toBe(false);
          expect(lic.code).toBe("Unknown License");
          expect(lic.url).toBeNull();
        }
      });

      it("rejects unsupported CC0 versions (only 1.0 is defined)", () => {
        const lic = parseCcLicense("https://creativecommons.org/publicdomain/zero/2.0/");
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });
    });

    describe("Fake License Slugs and Malformed Paths", () => {
      it("rejects fake or arbitrary license slugs on legitimate hostname", () => {
        const fakeSlugs = ["commercial", "gpl", "bsd", "mit", "fake-by", "all-rights-reserved"];
        for (const slug of fakeSlugs) {
          const lic = parseCcLicense(`https://creativecommons.org/licenses/${slug}/4.0/`);
          expect(lic.isVerified).toBe(false);
          expect(lic.code).toBe("Unknown License");
        }
      });

      it("rejects paths with missing version", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by/");
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("rejects non-license paths on creativecommons.org", () => {
        const paths = [
          "https://creativecommons.org/about/",
          "https://creativecommons.org/licenses/",
          "https://creativecommons.org/publicdomain/",
          "https://creativecommons.org/",
          "https://creativecommons.org/licenses/by/4.0/extra/garbage/subpath",
        ];
        for (const p of paths) {
          const lic = parseCcLicense(p);
          expect(lic.isVerified).toBe(false);
          expect(lic.code).toBe("Unknown License");
        }
      });
    });

    describe("Hostname and Protocol Security Validation", () => {
      it("rejects lookalike or attacker hostnames", () => {
        const lookalikes = [
          "https://creativecommons.org.attacker.com/licenses/by/4.0/",
          "https://evil-creativecommons.org/licenses/by/4.0/",
          "https://creativecommons.net/licenses/by/4.0/",
          "https://creativecommons.co/licenses/by/4.0/",
          "https://notcreativecommons.org/licenses/by/4.0/",
        ];
        for (const url of lookalikes) {
          const lic = parseCcLicense(url);
          expect(lic.isVerified).toBe(false);
          expect(lic.code).toBe("Unknown License");
        }
      });

      it("accepts both creativecommons.org and www.creativecommons.org", () => {
        const lic1 = parseCcLicense("https://creativecommons.org/licenses/by/4.0/");
        const lic2 = parseCcLicense("https://www.creativecommons.org/licenses/by/4.0/");
        expect(lic1.isVerified).toBe(true);
        expect(lic2.isVerified).toBe(true);
      });

      it("standardizes http: to https: in output url", () => {
        const lic = parseCcLicense("http://creativecommons.org/licenses/by-sa/4.0/");
        expect(lic.isVerified).toBe(true);
        expect(lic.url).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
      });

      it("rejects unsupported or dangerous protocols", () => {
        const protocols = [
          "javascript:alert(1)",
          "ftp://creativecommons.org/licenses/by/4.0/",
          "file:///licenses/by/4.0/",
          "data:text/html,<script>alert(1)</script>",
        ];
        for (const p of protocols) {
          const lic = parseCcLicense(p);
          expect(lic.isVerified).toBe(false);
          expect(lic.code).toBe("Unknown License");
        }
      });

      it("rejects non-standard ports and embedded credentials", () => {
        const withPort = parseCcLicense("https://creativecommons.org:8080/licenses/by/4.0/");
        expect(withPort.isVerified).toBe(false);

        const withAuth = parseCcLicense("https://user:pass@creativecommons.org/licenses/by/4.0/");
        expect(withAuth.isVerified).toBe(false);
      });
    });

    describe("Missing and Null URL Handling", () => {
      it("treats null, undefined, empty, and non-string values as Unknown License", () => {
        expect(parseCcLicense(null).isVerified).toBe(false);
        expect(parseCcLicense(undefined).isVerified).toBe(false);
        expect(parseCcLicense("").isVerified).toBe(false);
        expect(parseCcLicense("   ").isVerified).toBe(false);
        // @ts-expect-error testing invalid type
        expect(parseCcLicense(12345).isVerified).toBe(false);
      });
    });

    describe("Contradictory License URL vs Permission Flags", () => {
      it("rejects CC BY when raw flags claim non-commercial (ccnc: true)", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by/4.0/", {
          ccnc: true,
        });
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("rejects CC BY when raw flags claim share-alike (ccsa: true)", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by/4.0/", {
          ccsa: true,
        });
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("rejects CC BY-NC when raw flags claim commercial use is allowed (ccnc: false)", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by-nc/4.0/", {
          ccnc: false,
        });
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("rejects CC BY-ND when raw flags claim adaptations are allowed (ccnd: false)", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by-nd/3.0/", {
          ccnd: false,
        });
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("rejects CC0 when raw flags claim restrictions exist", () => {
        const lic = parseCcLicense("https://creativecommons.org/publicdomain/zero/1.0/", {
          ccnc: "true",
        });
        expect(lic.isVerified).toBe(false);
        expect(lic.code).toBe("Unknown License");
      });

      it("accepts consistent raw flags that match the canonical license URL", () => {
        const lic = parseCcLicense("https://creativecommons.org/licenses/by-nc-sa/3.0/", {
          ccnc: "true",
          ccsa: true,
          ccnd: false,
        });
        expect(lic.isVerified).toBe(true);
        expect(lic.nonCommercial).toBe(true);
        expect(lic.shareAlike).toBe(true);
        expect(lic.noDerivatives).toBe(false);
      });
    });

    describe("Unknown License Contract Guarantee", () => {
      it("guarantees an unknown license is never marked verified or playable", () => {
        const unknown = createUnknownLicense();
        expect(unknown.isVerified).toBe(false);
        expect(unknown.isCreativeCommons).toBe(false);
        expect(unknown.url).toBeNull();
        expect(unknown.code).toBe("Unknown License");
        expect(unknown.nonCommercial).toBe(false);
        expect(unknown.shareAlike).toBe(false);
        expect(unknown.noDerivatives).toBe(false);
      });
    });
  });
});
