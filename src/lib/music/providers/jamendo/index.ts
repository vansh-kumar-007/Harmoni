import "server-only";
import {
  MusicSearchResult,
  NormalizedTrack,
  NormalizedArtist,
  NormalizedAlbum,
} from "../../types";
import {
  fetchFromJamendo,
  isJamendoConfigured,
  JamendoError,
} from "./client";
import {
  JamendoTracksResponseSchema,
  JamendoArtistsResponseSchema,
  JamendoAlbumsResponseSchema,
} from "./types";
import {
  mapJamendoTrack,
  mapJamendoArtist,
  mapJamendoAlbum,
} from "./mapper";

export { isJamendoConfigured, JamendoError };

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function normalizeSearchBounds(limit?: number, offset?: number): { limit: number; offset: number } {
  const boundedLimit = Math.min(
    Math.max(Number.isInteger(limit) ? Number(limit) : DEFAULT_LIMIT, 1),
    MAX_LIMIT
  );
  const boundedOffset = Math.max(
    Number.isInteger(offset) ? Number(offset) : 0,
    0
  );
  return { limit: boundedLimit, offset: boundedOffset };
}

/**
 * Searches Jamendo tracks using the official GET /v3.0/tracks endpoint.
 * Always includes the documented `include=licenses` parameter to retrieve
 * full Creative Commons licensing and attribution information.
 */
export async function searchJamendoTracks(
  options: SearchOptions
): Promise<MusicSearchResult<NormalizedTrack>> {
  const trimmedQuery = options.query.trim();
  const { limit, offset } = normalizeSearchBounds(options.limit, options.offset);

  if (!trimmedQuery) {
    return {
      type: "tracks",
      query: "",
      offset,
      limit,
      totalCount: 0,
      hasMore: false,
      items: [],
    };
  }

  const raw = await fetchFromJamendo<unknown>({
    endpoint: "tracks",
    params: {
      search: trimmedQuery,
      type: "single albumtrack",
      limit,
      offset,
      include: "licenses",
    },
  });

  const parsed = JamendoTracksResponseSchema.parse(raw);
  const items = parsed.results.map(mapJamendoTrack);

  return {
    type: "tracks",
    query: trimmedQuery,
    offset,
    limit,
    totalCount: parsed.headers.results_fullcount ?? null,
    hasMore: items.length === limit,
    items,
  };
}

/**
 * Searches Jamendo artists using the documented GET /v3.0/artists endpoint
 * with the required `namesearch` parameter.
 */
export async function searchJamendoArtists(
  options: SearchOptions
): Promise<MusicSearchResult<NormalizedArtist>> {
  const trimmedQuery = options.query.trim();
  const { limit, offset } = normalizeSearchBounds(options.limit, options.offset);

  if (!trimmedQuery) {
    return {
      type: "artists",
      query: "",
      offset,
      limit,
      totalCount: 0,
      hasMore: false,
      items: [],
    };
  }

  const raw = await fetchFromJamendo<unknown>({
    endpoint: "artists",
    params: {
      namesearch: trimmedQuery,
      limit,
      offset,
    },
  });

  const parsed = JamendoArtistsResponseSchema.parse(raw);
  const items = parsed.results.map(mapJamendoArtist);

  return {
    type: "artists",
    query: trimmedQuery,
    offset,
    limit,
    totalCount: parsed.headers.results_fullcount ?? null,
    hasMore: items.length === limit,
    items,
  };
}

/**
 * Searches Jamendo albums using the documented GET /v3.0/albums endpoint
 * with the required `namesearch` parameter.
 */
export async function searchJamendoAlbums(
  options: SearchOptions
): Promise<MusicSearchResult<NormalizedAlbum>> {
  const trimmedQuery = options.query.trim();
  const { limit, offset } = normalizeSearchBounds(options.limit, options.offset);

  if (!trimmedQuery) {
    return {
      type: "albums",
      query: "",
      offset,
      limit,
      totalCount: 0,
      hasMore: false,
      items: [],
    };
  }

  const raw = await fetchFromJamendo<unknown>({
    endpoint: "albums",
    params: {
      namesearch: trimmedQuery,
      limit,
      offset,
    },
  });

  const parsed = JamendoAlbumsResponseSchema.parse(raw);
  const items = parsed.results.map(mapJamendoAlbum);

  return {
    type: "albums",
    query: trimmedQuery,
    offset,
    limit,
    totalCount: parsed.headers.results_fullcount ?? null,
    hasMore: items.length === limit,
    items,
  };
}
