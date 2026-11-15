import { NormalizedTrack, NormalizedArtist, NormalizedAlbum } from "../../types";
import { parseCcLicense, formatDuration } from "../../licenses";
import { JamendoTrackItem, JamendoArtistItem, JamendoAlbumItem } from "./types";

function sanitizeHttpUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return null;
}

/**
 * Maps a validated raw Jamendo track to the normalized application DTO.
 * Explicitly strips any upstream streaming audio URLs, direct download links,
 * or proprietary parameters to ensure the search layer remains strictly discovery-only.
 */
export function mapJamendoTrack(raw: JamendoTrackItem): NormalizedTrack {
  const coverUrl = sanitizeHttpUrl(raw.album_image || raw.image);
  const jamendoUrl =
    sanitizeHttpUrl(raw.shareurl || raw.shorturl) ||
    `https://www.jamendo.com/track/${raw.id}`;

  return {
    id: String(raw.id),
    provider: "JAMENDO",
    title: raw.name?.trim() || "Untitled Track",
    artistId: String(raw.artist_id),
    artistName: raw.artist_name?.trim() || "Unknown Artist",
    albumId: raw.album_id ? String(raw.album_id) : null,
    albumTitle: raw.album_name ? raw.album_name.trim() : null,
    durationSeconds: typeof raw.duration === "number" && raw.duration >= 0 ? raw.duration : 0,
    durationFormatted: formatDuration(raw.duration || 0),
    coverUrl,
    jamendoUrl,
    license: parseCcLicense(raw.license_ccurl, raw.licenses),
  };
}

/**
 * Maps a validated raw Jamendo artist to the normalized application DTO.
 */
export function mapJamendoArtist(raw: JamendoArtistItem): NormalizedArtist {
  const imageUrl = sanitizeHttpUrl(raw.image);
  const website = sanitizeHttpUrl(raw.website);
  const jamendoUrl =
    sanitizeHttpUrl(raw.shareurl || raw.shorturl) ||
    `https://www.jamendo.com/artist/${raw.id}`;

  return {
    id: String(raw.id),
    provider: "JAMENDO",
    name: raw.name?.trim() || "Unknown Artist",
    imageUrl,
    website,
    joinDate: raw.joindate ? raw.joindate.trim() : null,
    jamendoUrl,
  };
}

/**
 * Maps a validated raw Jamendo album to the normalized application DTO.
 */
export function mapJamendoAlbum(raw: JamendoAlbumItem): NormalizedAlbum {
  const coverUrl = sanitizeHttpUrl(raw.image);
  const jamendoUrl =
    sanitizeHttpUrl(raw.shareurl || raw.shorturl) ||
    `https://www.jamendo.com/list/a${raw.id}`;

  return {
    id: String(raw.id),
    provider: "JAMENDO",
    title: raw.name?.trim() || "Untitled Album",
    artistId: String(raw.artist_id),
    artistName: raw.artist_name?.trim() || "Unknown Artist",
    coverUrl,
    releaseDate: raw.releasedate ? raw.releasedate.trim() : null,
    jamendoUrl,
  };
}
