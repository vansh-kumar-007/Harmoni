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

const CC_NAMES: Record<string, string> = {
  by: "Creative Commons Attribution",
  "by-sa": "Creative Commons Attribution-ShareAlike",
  "by-nc": "Creative Commons Attribution-NonCommercial",
  "by-nc-sa": "Creative Commons Attribution-NonCommercial-ShareAlike",
  "by-nc-nd": "Creative Commons Attribution-NonCommercial-NoDerivatives",
  "by-nd": "Creative Commons Attribution-NoDerivatives",
  zero: "Creative Commons CC0 Public Domain Dedication",
};

/**
 * Parses and verifies a Creative Commons license URL from Jamendo metadata.
 * Validates that the URL belongs to creativecommons.org and extracts
 * the canonical CC designation, human-readable name, and permission flags.
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

    // Strict validation: must be HTTP or HTTPS on creativecommons.org
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      (parsed.hostname !== "creativecommons.org" && parsed.hostname !== "www.creativecommons.org")
    ) {
      return createUnknownLicense();
    }

    // Always standardize to https for modern secure browsing
    parsed.protocol = "https:";
    const cleanUrl = parsed.toString();

    // Check for CC0 public domain
    if (parsed.pathname.includes("/publicdomain/zero/")) {
      const match = parsed.pathname.match(/\/publicdomain\/zero\/([0-9.]+)/i);
      const version = match ? match[1] : "1.0";
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

    // Match standard /licenses/<type>/<version>/
    const match = parsed.pathname.match(/\/licenses\/([a-z-]+)\/([0-9.]+)/i);
    if (!match) {
      return createUnknownLicense();
    }

    const typeKey = match[1].toLowerCase();
    const version = match[2];

    const baseName = CC_NAMES[typeKey] || `Creative Commons ${typeKey.toUpperCase()}`;
    const code = `CC ${typeKey.toUpperCase()} ${version}`;

    // Flags can be derived from the license slug or the raw Jamendo licenses object
    const nonCommercial =
      typeKey.includes("nc") ||
      rawLicensesObj?.ccnc === true ||
      rawLicensesObj?.ccnc === "true";

    const shareAlike =
      typeKey.includes("sa") ||
      rawLicensesObj?.ccsa === true ||
      rawLicensesObj?.ccsa === "true";

    const noDerivatives =
      typeKey.includes("nd") ||
      rawLicensesObj?.ccnd === true ||
      rawLicensesObj?.ccnd === "true";

    return {
      code,
      name: `${baseName} ${version}`,
      url: cleanUrl,
      isCreativeCommons: true,
      isVerified: true,
      nonCommercial,
      shareAlike,
      noDerivatives,
    };
  } catch {
    return createUnknownLicense();
  }
}

function createUnknownLicense(): LicenseInfo {
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
