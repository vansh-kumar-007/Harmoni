/**
 * Harmoni Avatar Presets & Profile Constants
 *
 * Defines the centralized registry of eight handcrafted SVG avatar presets,
 * validation type guards, metadata, and fallback resolution.
 */

export const AVATAR_REGISTRY = [
  "avatar_1",
  "avatar_2",
  "avatar_3",
  "avatar_4",
  "avatar_5",
  "avatar_6",
  "avatar_7",
  "avatar_8",
] as const;

export type AvatarKey = (typeof AVATAR_REGISTRY)[number];

export const DEFAULT_AVATAR: AvatarKey = "avatar_1";

export const MAX_BIO_LENGTH = 250;

export interface AvatarMeta {
  key: AvatarKey;
  name: string;
  concept: string;
  description: string;
}

export const AVATARS_META: Record<AvatarKey, AvatarMeta> = {
  avatar_1: {
    key: "avatar_1",
    name: "Studio Turntable",
    concept: "Amber Studio Turntable",
    description: "Analog vinyl platter, concentric sound grooves, tonearm & amber spindle.",
  },
  avatar_2: {
    key: "avatar_2",
    name: "Tube Preamp",
    concept: "Golden Tube Preamp",
    description: "Glass envelope, socket base, and glowing amber vacuum tube filament.",
  },
  avatar_3: {
    key: "avatar_3",
    name: "Obsidian Waveform",
    concept: "Obsidian Waveform",
    description: "Intersecting sine sound waves, harmonic resonant curves, and peak nodes.",
  },
  avatar_4: {
    key: "avatar_4",
    name: "Vinyl Groove Disc",
    concept: "Geometric Vinyl Disc",
    description: "Concentric disc grooves, central record label, gloss sheen & spindle hole.",
  },
  avatar_5: {
    key: "avatar_5",
    name: "Aurora Prism",
    concept: "Nordic Aurora Prism",
    description: "Refractive crystal prism dispersing amber light into cyan & emerald rays.",
  },
  avatar_6: {
    key: "avatar_6",
    name: "Classic Cassette",
    concept: "Neon Cassette Tape",
    description: "Vintage compact cassette shell, label window, tape spools & bridge.",
  },
  avatar_7: {
    key: "avatar_7",
    name: "Audio Equalizer",
    concept: "Audio Spectrum Equalizer",
    description: "Five-band frequency spectrum with peak indicator dots and dB baseline.",
  },
  avatar_8: {
    key: "avatar_8",
    name: "Acoustic Reverberation",
    concept: "Acoustic Reverberation",
    description: "Expanding concentric soundwave propagation rings with directional ticks.",
  },
};

/**
 * Type guard verifying whether an unknown value matches a valid AvatarKey.
 */
export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_REGISTRY as readonly string[]).includes(value);
}

/**
 * Resolves an avatar key with a guaranteed fallback to DEFAULT_AVATAR ('avatar_1').
 */
export function getValidAvatarKey(value: unknown): AvatarKey {
  if (isAvatarKey(value)) {
    return value;
  }
  return DEFAULT_AVATAR;
}

/**
 * Validates whether a given URL is a safe, valid HTTP or HTTPS image URL.
 * Strictly disallows unexpected protocols such as javascript:, data:, file:, etc.
 */
export function isValidImageUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
