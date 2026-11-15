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
 * to a verified Jamendo CDN domain or subdomain.
 */
export function isValidJamendoStreamUrl(urlStr: string): boolean {
  if (!urlStr || typeof urlStr !== "string") return false;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== "443") return false;

    const hostname = parsed.hostname.toLowerCase();
    // Validate hostname characters
    if (!/^[a-z0-9.-]+$/.test(hostname)) return false;
    if (hostname.includes("..") || hostname.startsWith(".") || hostname.endsWith(".")) {
      return false;
    }

    const isJamendoDomain =
      hostname === "jamendo.com" ||
      hostname.endsWith(".jamendo.com") ||
      hostname === "jamendo-licensing.com" ||
      hostname.endsWith(".jamendo-licensing.com");

    return isJamendoDomain;
  } catch {
    return false;
  }
}

/**
 * Resolves a playable audio stream for a track from Jamendo.
 * 
 * Enforces:
 * - Specific track query with audioformat=mp32 and include=licenses
 * - Verified Creative Commons license requirement (refuses playback if unverified)
 * - Exclusive extraction of the `audio` field (never audiodownload)
 * - HTTPS and trusted Jamendo CDN host validation
 * - Normalized track metadata with all secrets protected
 */
export async function resolveJamendoTrackStream(
  trackId: string
): Promise<ResolvedTrackStream> {
  const trimmedId = trackId ? String(trackId).trim() : "";
  if (!trimmedId || !/^\d+$/.test(trimmedId)) {
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

  const rawTrack = parsed.results[0];
  const track = mapJamendoTrack(rawTrack);

  // Strictly enforce verified Creative Commons license
  if (!track.license.isVerified) {
    throw new JamendoError(
      `Playback unavailable: track "${track.title}" has an unverified or unrecognized license (${track.license.code})`,
      "API_ERROR",
      403
    );
  }

  // Stream URL validation: strictly from rawTrack.audio
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
