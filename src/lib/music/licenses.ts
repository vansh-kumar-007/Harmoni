import { LicenseInfo } from "./types";

/**
 * Formats duration in seconds to "m:ss" (or "h:mm:ss" for long audio).
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const rounded = Math.floor(seconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;

  const paddedSecs = secs.toString().padStart(2, "0");

  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, "0");
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }

  return `${mins}:${paddedSecs}`;
}

interface SupportedCcLicenseDefinition {
  identifier: string;
  codeSlug: string;
  fullName: string;
  nonCommercial: boolean;
  shareAlike: boolean;
  noDerivatives: boolean;
  supportedVersions?: Set<string>;
}

/**
 * Officially recognized Creative Commons license identifiers:
 * https://creativecommons.org/share-your-work/cclicenses/
 * https://wiki.creativecommons.org/wiki/License_Versions
 */
const SUPPORTED_CC_LICENSES: Record<string, SupportedCcLicenseDefinition> = {
  by: {
    identifier: "by",
    codeSlug: "BY",
    fullName: "Creative Commons Attribution",
    nonCommercial: false,
    shareAlike: false,
    noDerivatives: false,
  },
  "by-sa": {
    identifier: "by-sa",
    codeSlug: "BY-SA",
    fullName: "Creative Commons Attribution-ShareAlike",
    nonCommercial: false,
    shareAlike: true,
    noDerivatives: false,
  },
  "by-nd": {
    identifier: "by-nd",
    codeSlug: "BY-ND",
    fullName: "Creative Commons Attribution-NoDerivatives",
    nonCommercial: false,
    shareAlike: false,
    noDerivatives: true,
  },
  "by-nc": {
    identifier: "by-nc",
    codeSlug: "BY-NC",
    fullName: "Creative Commons Attribution-NonCommercial",
    nonCommercial: true,
    shareAlike: false,
    noDerivatives: false,
  },
  "by-nc-sa": {
    identifier: "by-nc-sa",
    codeSlug: "BY-NC-SA",
    fullName: "Creative Commons Attribution-NonCommercial-ShareAlike",
    nonCommercial: true,
    shareAlike: true,
    noDerivatives: false,
  },
  "by-nc-nd": {
    identifier: "by-nc-nd",
    codeSlug: "BY-NC-ND",
    fullName: "Creative Commons Attribution-NonCommercial-NoDerivatives",
    nonCommercial: true,
    shareAlike: false,
    noDerivatives: true,
  },
  // Historical 1.0 license identifier used prior to standardizing on "by-nc-nd"
  "by-nd-nc": {
    identifier: "by-nd-nc",
    codeSlug: "BY-ND-NC",
    fullName: "Creative Commons Attribution-NoDerivs-NonCommercial",
    nonCommercial: true,
    shareAlike: false,
    noDerivatives: true,
    supportedVersions: new Set(["1.0"]),
  },
};

interface VersionRule {
  allowGeneric: boolean;
  jurisdictions: Set<string>;
}

/**
 * Officially catalogued Creative Commons versions and their supported jurisdictions:
 * Derived from https://creativecommons.org/licenses/list.en and https://wiki.creativecommons.org/wiki/License_Versions
 */
const VERSION_JURISDICTION_RULES: Record<string, VersionRule> = {
  "1.0": {
    allowGeneric: true,
    jurisdictions: new Set(["br", "de", "fi", "il", "nl", "tw"]),
  },
  "2.0": {
    allowGeneric: true,
    jurisdictions: new Set([
      "at", "au", "be", "br", "ca", "cl", "de", "es", "fr", "hr",
      "it", "jp", "kr", "nl", "pl", "tw", "uk", "za",
    ]),
  },
  "2.1": {
    // Version 2.1 was created specifically for 4 jurisdictions to resolve local porting issues; no generic 2.1 exists.
    allowGeneric: false,
    jurisdictions: new Set(["au", "ca", "es", "jp"]),
  },
  "2.5": {
    allowGeneric: true,
    jurisdictions: new Set([
      "ar", "au", "bg", "br", "ca", "ch", "cn", "co", "dk", "es",
      "hr", "hu", "il", "in", "it", "mk", "mt", "mx", "my", "nl",
      "pe", "pl", "pt", "scotland", "se", "si", "tw", "za",
    ]),
  },
  "3.0": {
    allowGeneric: true,
    jurisdictions: new Set([
      "am", "at", "au", "az", "br", "ca", "ch", "cl", "cn", "cr",
      "cz", "de", "ec", "ee", "eg", "es", "fr", "ge", "gr", "gt",
      "hk", "hr", "ie", "igo", "it", "lu", "nl", "no", "nz", "ph",
      "pl", "pr", "pt", "ro", "rs", "sg", "th", "tw", "ug", "us",
      "ve", "vn", "za",
    ]),
  },
  "4.0": {
    // Version 4.0 is strictly international with no jurisdiction-specific ports.
    allowGeneric: true,
    jurisdictions: new Set(),
  },
};

type ParsedFlag =
  | { state: "valid"; value: boolean }
  | { state: "absent" }
  | { state: "malformed" };

/**
 * Parses boolean-like flag from Jamendo licenses object.
 * Returns:
 * - { state: "valid", value: boolean } for documented boolean-like representations (true, false, "true", "false", 1, 0, "1", "0")
 * - { state: "absent" } when undefined, null, or empty string
 * - { state: "malformed" } for unrecognized non-null values (e.g. "maybe", "unknown", 42, objects)
 */
function parseRawLicenseFlag(value: unknown): ParsedFlag {
  if (value === undefined || value === null) {
    return { state: "absent" };
  }

  if (typeof value === "boolean") {
    return { state: "valid", value };
  }

  if (typeof value === "number") {
    if (value === 1) return { state: "valid", value: true };
    if (value === 0) return { state: "valid", value: false };
    return { state: "malformed" };
  }

  if (typeof value === "string") {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === "") return { state: "absent" };
    if (trimmed === "true" || trimmed === "1") return { state: "valid", value: true };
    if (trimmed === "false" || trimmed === "0") return { state: "valid", value: false };
    return { state: "malformed" };
  }

  return { state: "malformed" };
}

const DEED_REGEX = /^deed(?:\.[a-z0-9_-]+)?$/i;

/**
 * Parses and strictly verifies a Creative Commons license URL from Jamendo metadata.
 * Validates that:
 * 1. The protocol is strictly http: or https:
 * 2. The hostname is strictly creativecommons.org or www.creativecommons.org (no lookalikes)
 * 3. No non-standard ports or credentials are embedded in the URL
 * 4. The license identifier is one of the official Creative Commons licenses, historical CC 1.0 BY-ND-NC, or CC0
 * 5. The license version and jurisdiction combination is verified against the official catalogue:
 *    - 1.0, 2.0, 2.5, 3.0, 4.0 supported (with generic allowed)
 *    - 2.1 supported specifically for its 4 documented jurisdictions (au, ca, es, jp); generic 2.1 rejected
 *    - 4.0 strictly international with no jurisdictions
 *    - Scotland (/2.5/scotland/) supported under 2.5
 *    - Fabricated or arbitrary jurisdictions rejected
 * 6. Raw metadata permission flags are strictly audited:
 *    - Malformed values (e.g. "maybe") yield Unknown License
 *    - Contradictory values yield Unknown License
 *
 * Missing, malformed, unsupported, or contradictory licenses return an unverified Unknown License.
 */
export function parseCcLicense(
  rawUrl?: string | null,
  rawLicensesObj?: Record<string, unknown> | null
): LicenseInfo {
  if (!rawUrl || typeof rawUrl !== "string") {
    return createUnknownLicense();
  }

  try {
    const parsed = new URL(rawUrl.trim());

    // 1. Protocol must be http: or https:
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return createUnknownLicense();
    }

    // 2. Hostname must strictly be creativecommons.org or www.creativecommons.org
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "creativecommons.org" && hostname !== "www.creativecommons.org") {
      return createUnknownLicense();
    }

    // 3. Port must not be a non-standard port
    if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
      return createUnknownLicense();
    }

    // 4. Reject URLs with username / password credentials
    if (parsed.username || parsed.password) {
      return createUnknownLicense();
    }

    // Standardize URL to https and clean query / hash
    parsed.protocol = "https:";
    parsed.port = "";
    parsed.search = "";
    parsed.hash = "";
    const cleanUrl = parsed.toString();

    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments.length < 3) {
      return createUnknownLicense();
    }

    // 5. Check for CC0 public domain dedication (/publicdomain/zero/<version>/...)
    if (segments[0].toLowerCase() === "publicdomain" && segments[1].toLowerCase() === "zero") {
      const version = segments[2];
      // Only CC0 1.0 is officially defined by Creative Commons
      if (version !== "1.0") {
        return createUnknownLicense();
      }

      // Check remaining segments (only optional deed allowed)
      if (segments.length === 4) {
        if (!DEED_REGEX.test(segments[3])) {
          return createUnknownLicense();
        }
      } else if (segments.length > 4) {
        return createUnknownLicense();
      }

      // Check raw licenses object flags
      if (rawLicensesObj && typeof rawLicensesObj === "object" && !Array.isArray(rawLicensesObj)) {
        const rawNc = parseRawLicenseFlag(rawLicensesObj.ccnc);
        const rawSa = parseRawLicenseFlag(rawLicensesObj.ccsa);
        const rawNd = parseRawLicenseFlag(rawLicensesObj.ccnd);

        if (
          rawNc.state === "malformed" ||
          rawSa.state === "malformed" ||
          rawNd.state === "malformed"
        ) {
          return createUnknownLicense();
        }

        // CC0 cannot have restrictions (NC, SA, ND must not be asserted as true)
        if (
          (rawNc.state === "valid" && rawNc.value !== false) ||
          (rawSa.state === "valid" && rawSa.value !== false) ||
          (rawNd.state === "valid" && rawNd.value !== false)
        ) {
          return createUnknownLicense();
        }
      }

      return {
        code: `CC0 ${version}`,
        name: `Creative Commons CC0 ${version} Public Domain Dedication`,
        url: cleanUrl,
        isCreativeCommons: true,
        isVerified: true,
        nonCommercial: false,
        shareAlike: false,
        noDerivatives: false,
      };
    }

    // 6. Check for standard Creative Commons licenses (/licenses/<identifier>/<version>/...)
    if (segments[0].toLowerCase() !== "licenses") {
      return createUnknownLicense();
    }

    const typeKey = segments[1].toLowerCase();
    const version = segments[2];

    // Validate supported identifier
    const licenseDef = SUPPORTED_CC_LICENSES[typeKey];
    if (!licenseDef) {
      return createUnknownLicense();
    }

    // Check version constraint on identifier (e.g. by-nd-nc is 1.0 only)
    if (licenseDef.supportedVersions && !licenseDef.supportedVersions.has(version)) {
      return createUnknownLicense();
    }

    // Check version existence in catalogue rules
    const versionRule = VERSION_JURISDICTION_RULES[version];
    if (!versionRule) {
      return createUnknownLicense();
    }

    // Parse optional jurisdiction and deed segments
    let jurisdiction: string | null = null;
    if (segments.length === 4) {
      if (DEED_REGEX.test(segments[3])) {
        jurisdiction = null;
      } else {
        jurisdiction = segments[3].toLowerCase();
      }
    } else if (segments.length === 5) {
      jurisdiction = segments[3].toLowerCase();
      if (!DEED_REGEX.test(segments[4])) {
        return createUnknownLicense();
      }
    } else if (segments.length > 5) {
      return createUnknownLicense();
    }

    // Validate version and jurisdiction combination
    if (jurisdiction === null) {
      if (!versionRule.allowGeneric) {
        // e.g. Version 2.1 requires an explicit jurisdiction
        return createUnknownLicense();
      }
    } else {
      if (!versionRule.jurisdictions.has(jurisdiction)) {
        // Unrecognized or unsupported jurisdiction for this version
        return createUnknownLicense();
      }
    }

    // Check raw licenses object flags
    if (rawLicensesObj && typeof rawLicensesObj === "object" && !Array.isArray(rawLicensesObj)) {
      const rawNc = parseRawLicenseFlag(rawLicensesObj.ccnc);
      const rawSa = parseRawLicenseFlag(rawLicensesObj.ccsa);
      const rawNd = parseRawLicenseFlag(rawLicensesObj.ccnd);

      // Malformed raw flag values reject immediately
      if (
        rawNc.state === "malformed" ||
        rawSa.state === "malformed" ||
        rawNd.state === "malformed"
      ) {
        return createUnknownLicense();
      }

      // Contradictory raw flags reject immediately
      if (rawNc.state === "valid" && rawNc.value !== licenseDef.nonCommercial) {
        return createUnknownLicense();
      }
      if (rawSa.state === "valid" && rawSa.value !== licenseDef.shareAlike) {
        return createUnknownLicense();
      }
      if (rawNd.state === "valid" && rawNd.value !== licenseDef.noDerivatives) {
        return createUnknownLicense();
      }
    }

    const code = `CC ${licenseDef.codeSlug} ${version}`;
    const name = `${licenseDef.fullName} ${version}`;

    return {
      code,
      name,
      url: cleanUrl,
      isCreativeCommons: true,
      isVerified: true,
      nonCommercial: licenseDef.nonCommercial,
      shareAlike: licenseDef.shareAlike,
      noDerivatives: licenseDef.noDerivatives,
    };
  } catch {
    return createUnknownLicense();
  }
}

export function createUnknownLicense(): LicenseInfo {
  return {
    code: "Unknown License",
    name: "Unspecified or Unknown License",
    url: null,
    isCreativeCommons: false,
    isVerified: false,
    nonCommercial: false,
    shareAlike: false,
    noDerivatives: false,
  };
}
