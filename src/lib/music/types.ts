export type SearchType = "tracks" | "artists" | "albums";

export interface LicenseInfo {
  code: string; // e.g. "CC BY-NC-SA 3.0", "CC BY 4.0", "CC0 1.0", "Unknown License"
  name: string; // Human-friendly description
  url: string | null; // Canonical license URL
  isCreativeCommons: boolean;
  isVerified: boolean;
  nonCommercial: boolean;
  shareAlike: boolean;
  noDerivatives: boolean;
}

export interface NormalizedTrack {
  id: string; // Jamendo Track ID (permanent provider ID)
  provider: "JAMENDO";
  title: string;
  artistId: string;
  artistName: string;
  albumId: string | null;
  albumTitle: string | null;
  durationSeconds: number;
  durationFormatted: string; // "m:ss" format
  coverUrl: string | null;
  jamendoUrl: string; // Direct canonical link to track on Jamendo
  license: LicenseInfo;
}

export interface NormalizedArtist {
  id: string; // Jamendo Artist ID
  provider: "JAMENDO";
  name: string;
  imageUrl: string | null;
  website: string | null;
  joinDate: string | null;
  jamendoUrl: string; // Direct canonical link to artist on Jamendo
}

export interface NormalizedAlbum {
  id: string; // Jamendo Album ID
  provider: "JAMENDO";
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string | null;
  releaseDate: string | null;
  jamendoUrl: string; // Direct canonical link to album on Jamendo
}

export interface MusicSearchResult<T = NormalizedTrack | NormalizedArtist | NormalizedAlbum> {
  type: SearchType;
  query: string;
  offset: number;
  limit: number;
  totalCount: number | null;
  hasMore: boolean;
  items: T[];
}
