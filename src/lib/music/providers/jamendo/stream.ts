import "server-only";
import { NormalizedTrack } from "../../types";
import { fetchFromJamendo, JamendoError } from "./client";
import { JamendoTracksResponseSchema } from "./types";
import { mapJamendoTrack } from "./mapper";

export interface ResolvedTrackStream {
  track: NormalizedTrack;
  streamUrl: string;
  format: "mp3";
  bitrate: 128;
}

/**
 * Validates that an audio stream URL uses HTTPS and belongs strictly
 * to Jamendo's legitimate audio storage infrastructure: storage.jamendo.com
 * or its verified storage subdomains (e.g. prod-1.storage.jamendo.com).
 * 
 * Explicitly rejects:
 * - Arbitrary *.jamendo.com hosts (e.g. api, www, usercontent image CDN)
 * - Download-oriented hosts (e.g. mp3d.jamendo.com, mp3l.jamendo.com)
 * - Licensing hosts (e.g. *.jamendo-licensing.com)
 * - Plain HTTP, embedded credentials, non-standard ports, IP addresses, spoofed domains
 */
export function isValidJamendoStreamUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== "443") return false;

    const hostname = parsed.hostname.toLowerCase();
    // Validate strict hostname characters (alphanumeric, hyphen, dot)
    if (!/^[a-z0-9.-]+$/.test(hostname)) return false;
    if (hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) {
      return false;
    }

    // Must strictly be storage.jamendo.com or [subdomain].storage.jamendo.com
    // e.g. "storage.jamendo.com", "prod-1.storage.jamendo.com", "prod-2.storage.jamendo.com"
    const isLegitimateStorageHost = /^(?:[a-z0-9-]+\.)*storage\.jamendo\.com$/.test(hostname);

    return isLegitimateStorageHost;
  } catch {
    return false;
  }
}

/**
 * Resolves a playable audio stream for a track from Jamendo.
 * 
 * Enforces:
 * - Strictly positive integer track ID format (/^[1-9]\d*$/), avoiding unsafe JS number conversions
 * - Specific track query with audioformat=mp32, type="single albumtrack", and include=licenses
 * - Upstream response verification: exactly 1 result with matching track ID
 * - Verified Creative Commons license requirement (refuses playback if unverified with HTTP 403)
 * - Exclusive extraction of the `audio` field (never audiodownload)
 * - Strict HTTPS and storage.jamendo.com CDN host validation
 * - Normalized track metadata with all secrets protected
 */
export async function resolveJamendoTrackStream(
  trackId: string
): Promise<ResolvedTrackStream> {
  const trimmedId = trackId ? String(trackId).trim() : "";
  // Strictly enforce positive decimal integer format (reject 0, negatives, decimals, alphabetic, empty)
  // Processed purely as a string to preserve precision for arbitrarily large IDs
  if (!trimmedId || !/^[1-9]\d*$/.test(trimmedId)) {
    throw new JamendoError(
      "Invalid track ID. Track ID must be a positive integer.",
      "API_ERROR",
      400
    );
  }

  const raw = await fetchFromJamendo<unknown>({
    endpoint: "tracks",
    params: {
      id: trimmedId,
      type: "single albumtrack",
      include: "licenses",
      audioformat: "mp32",
    },
  });

  const parsed = JamendoTracksResponseSchema.parse(raw);
  if (!parsed.results || parsed.results.length === 0) {
    throw new JamendoError(
      `Track with ID ${trimmedId} was not found on Jamendo`,
      "API_ERROR",
      404
    );
  }

  // Upstream response must contain exactly 1 result for a single-track ID query
  if (parsed.results.length !== 1) {
    throw new JamendoError(
      `Jamendo API returned ${parsed.results.length} tracks for single-track ID query "${trimmedId}"`,
      "API_ERROR",
      502
    );
  }

  const rawTrack = parsed.results[0];

  // Verify returned track ID exactly matches the requested ID without lossy number conversion
  if (String(rawTrack.id).trim() !== trimmedId) {
    throw new JamendoError(
      `Jamendo API returned track ID "${rawTrack.id}", which does not match requested ID "${trimmedId}"`,
      "API_ERROR",
      502
    );
  }

  const track = mapJamendoTrack(rawTrack);

  // Strictly enforce verified Creative Commons license
  if (!track.license.isVerified) {
    throw new JamendoError(
      `Playback unavailable: track "${track.title}" has an unverified or unrecognized license (${track.license.code})`,
      "API_ERROR",
      403
    );
  }

  // Stream URL validation: strictly extracted from rawTrack.audio (never audiodownload)
  const audioUrl = rawTrack.audio;
  if (!audioUrl || typeof audioUrl !== "string" || !audioUrl.trim()) {
    throw new JamendoError(
      `No streaming audio URL available from Jamendo for track "${track.title}"`,
      "API_ERROR",
      502
    );
  }

  const sanitizedUrl = audioUrl.trim();
  if (!isValidJamendoStreamUrl(sanitizedUrl)) {
    throw new JamendoError(
      "Untrusted or invalid audio stream URL returned by upstream provider",
      "API_ERROR",
      502
    );
  }

  return {
    track,
    streamUrl: sanitizedUrl,
    format: "mp3",
    bitrate: 128,
  };
}
