import { z } from "zod";

export const JamendoHeadersSchema = z.object({
  status: z.string(),
  code: z.number(),
  error_message: z.string().optional().default(""),
  warnings: z.string().optional().default(""),
  results_count: z.number().optional().default(0),
  results_fullcount: z.number().optional(),
});

export type JamendoHeaders = z.infer<typeof JamendoHeadersSchema>;

export const JamendoTrackItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: z.string().default("Untitled Track"),
    duration: z.number().default(0),
    artist_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    artist_name: z.string().default("Unknown Artist"),
    album_id: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((v) => (v != null && v !== "" ? String(v) : null)),
    album_name: z
      .union([z.string(), z.null()])
      .optional()
      .transform((v) => (v != null && v.trim() !== "" ? v.trim() : null)),
    album_image: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    shareurl: z.string().optional().nullable(),
    shorturl: z.string().optional().nullable(),
    license_ccurl: z.string().optional().nullable(),
    licenses: z.record(z.string(), z.unknown()).optional().nullable(),
    audio: z.string().optional().nullable(),
    audiodownload: z.string().optional().nullable(),
  })
  .passthrough();

export type JamendoTrackItem = z.infer<typeof JamendoTrackItemSchema>;

export const JamendoTracksResponseSchema = z.object({
  headers: JamendoHeadersSchema,
  results: z.array(JamendoTrackItemSchema).default([]),
});

export type JamendoTracksResponse = z.infer<typeof JamendoTracksResponseSchema>;

export const JamendoArtistItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: z.string().default("Unknown Artist"),
    website: z.string().optional().nullable(),
    joindate: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
    shorturl: z.string().optional().nullable(),
    shareurl: z.string().optional().nullable(),
  })
  .passthrough();

export type JamendoArtistItem = z.infer<typeof JamendoArtistItemSchema>;

export const JamendoArtistsResponseSchema = z.object({
  headers: JamendoHeadersSchema,
  results: z.array(JamendoArtistItemSchema).default([]),
});

export type JamendoArtistsResponse = z.infer<typeof JamendoArtistsResponseSchema>;

export const JamendoAlbumItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    name: z.string().default("Untitled Album"),
    releasedate: z.string().optional().nullable(),
    artist_id: z.union([z.string(), z.number()]).transform((v) => String(v)),
    artist_name: z.string().default("Unknown Artist"),
    image: z.string().optional().nullable(),
    shorturl: z.string().optional().nullable(),
    shareurl: z.string().optional().nullable(),
  })
  .passthrough();

export type JamendoAlbumItem = z.infer<typeof JamendoAlbumItemSchema>;

export const JamendoAlbumsResponseSchema = z.object({
  headers: JamendoHeadersSchema,
  results: z.array(JamendoAlbumItemSchema).default([]),
});

export type JamendoAlbumsResponse = z.infer<typeof JamendoAlbumsResponseSchema>;
