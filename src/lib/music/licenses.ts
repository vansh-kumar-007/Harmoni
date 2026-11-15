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
}

/**
 * Officially recognized Creative Commons license identifiers:
 * https://creativecommons.org/share-your-work/cclicenses/
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
};

/**
 * Officially published Creative Commons license versions:
 * 1.0 (Generic), 2.0 (Generic), 2.5 (Generic), 3.0 (Unported), 4.0 (International).
 */
const SUPPORTED_CC_VERSIONS = new Set(["1.0", "2.0", "2.5", "3.0", "4.0"]);

/**
 * Parses boolean-like flag from Jamendo licenses object.
 * Returns null if missing or unrecognized.
 */
function parseRawLicenseFlag(value: unknown): boolean | null {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }
  return null;
}

/**
 * Regex for standard CC license URLs:
 * /licenses/<identifier>/<version>/[<jurisdiction>/][deed.<lang>]
 */
const CC_LICENSES_PATH_REGEX =
  /^\/licenses\/([a-z-]+)\/([0-9.]+)(?:\/([a-z]{2}(?:-[a-z]{2})?)?)?(?:\/(?:deed(?:\.[a-z]{2,5})?)?)?\/?$/i;

/**
 * Regex for CC0 Public Domain Dedication URLs:
 * /publicdomain/zero/<version>/[deed.<lang>]
 */
const CC0_PATH_REGEX =
  /^\/publicdomain\/zero\/([0-9.]+)(?:\/(?:deed(?:\.[a-z]{2,5})?)?)?\/?$/i;

/**
 * Parses and strictly verifies a Creative Commons license URL from Jamendo metadata.
 * Validates that:
 * 1. The protocol is strictly http: or https:
 * 2. The hostname is strictly creativecommons.org or www.creativecommons.org (no lookalikes)
 * 3. No non-standard ports or credentials are embedded in the URL
 * 4. The license identifier is one of the 6 official Creative Commons licenses or CC0
 * 5. The license version is an officially supported version (1.0, 2.0, 2.5, 3.0, 4.0 for CC, 1.0 for CC0)
 * 6. Contradictory permission flags in rawLicensesObj do not override the canonical license and instead yield an unverified license
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

    // 5. Check for CC0 public domain dedication
    const cc0Match = parsed.pathname.match(CC0_PATH_REGEX);
    if (cc0Match) {
      const version = cc0Match[1];
      // Only CC0 1.0 is officially defined by Creative Commons
      if (version !== "1.0") {
        return createUnknownLicense();
      }

      // Check for contradictory raw licenses object flags
      if (rawLicensesObj && typeof rawLicensesObj === "object" && !Array.isArray(rawLicensesObj)) {
        const rawNc = parseRawLicenseFlag(rawLicensesObj.ccnc);
        const rawSa = parseRawLicenseFlag(rawLicensesObj.ccsa);
        const rawNd = parseRawLicenseFlag(rawLicensesObj.ccnd);

        // CC0 cannot have restrictions (NC, SA, ND must not be asserted as true)
        if (rawNc === true || rawSa === true || rawNd === true) {
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
    const ccMatch = parsed.pathname.match(CC_LICENSES_PATH_REGEX);
    if (!ccMatch) {
      return createUnknownLicense();
    }

    const typeKey = ccMatch[1].toLowerCase();
    const version = ccMatch[2];

    // Validate supported identifier
    const licenseDef = SUPPORTED_CC_LICENSES[typeKey];
    if (!licenseDef) {
      return createUnknownLicense();
    }

    // Validate supported version
    if (!SUPPORTED_CC_VERSIONS.has(version)) {
      return createUnknownLicense();
    }

    // Check for contradictory raw licenses object flags
    if (rawLicensesObj && typeof rawLicensesObj === "object" && !Array.isArray(rawLicensesObj)) {
      const rawNc = parseRawLicenseFlag(rawLicensesObj.ccnc);
      const rawSa = parseRawLicenseFlag(rawLicensesObj.ccsa);
      const rawNd = parseRawLicenseFlag(rawLicensesObj.ccnd);

      // If raw flags are explicitly provided, they must not contradict the canonical license
      if (rawNc !== null && rawNc !== licenseDef.nonCommercial) {
        return createUnknownLicense();
      }
      if (rawSa !== null && rawSa !== licenseDef.shareAlike) {
        return createUnknownLicense();
      }
      if (rawNd !== null && rawNd !== licenseDef.noDerivatives) {
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
