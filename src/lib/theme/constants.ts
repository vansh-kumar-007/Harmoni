/**
 * Harmoni Centralized Theme System Registry & Metadata
 *
 * Single source of truth for all supported visual themes, metadata tokens,
 * type guards, and fallback resolution.
 */

export const THEME_REGISTRY = [
  "obsidian-studio",
  "nordic-aurora",
  "editorial-vinyl",
  "crimson-vigil",
  "cobalt-web",
] as const;

export type ThemeKey = (typeof THEME_REGISTRY)[number];

export const DEFAULT_THEME: ThemeKey = "obsidian-studio";

export interface ThemeMeta {
  key: ThemeKey;
  name: string;
  subtitle: string;
  description: string;
  chips: [string, string, string, string]; // [Canvas, Surface, Accent, Text]
  contrastRatio: string;
  wcagGrade: "AAA" | "AA";
}

export const THEMES_META: Record<ThemeKey, ThemeMeta> = {
  "obsidian-studio": {
    key: "obsidian-studio",
    name: "Obsidian Studio",
    subtitle: "Warm Analog Hi-Fi",
    description: "Brushed slate, warm charcoal, and vacuum-tube amber glow.",
    chips: ["#0b0c10", "#161922", "#f59e0b", "#f3f4f6"],
    contrastRatio: "18.06:1 (text) / 9.10:1 (btn)",
    wcagGrade: "AAA",
  },
  "nordic-aurora": {
    key: "nordic-aurora",
    name: "Nordic Aurora",
    subtitle: "Atmospheric Midnight Glass",
    description: "Midnight ink glass with bioluminescent cyan and mint emerald.",
    chips: ["#070a12", "#131c2e", "#06b6d4", "#f0fdf4"],
    contrastRatio: "19.04:1 (text) / 8.15:1 (btn)",
    wcagGrade: "AAA",
  },
  "editorial-vinyl": {
    key: "editorial-vinyl",
    name: "Editorial Vinyl",
    subtitle: "Swiss Typographic Record Club",
    description: "Matte vinyl black, Swiss grid typography, and electric acid-lime.",
    chips: ["#090a0d", "#161920", "#bef264", "#fafafa"],
    contrastRatio: "19.45:1 (text) / 15.15:1 (btn)",
    wcagGrade: "AAA",
  },
  "crimson-vigil": {
    key: "crimson-vigil",
    name: "Crimson Vigil",
    subtitle: "Daredevil-inspired Shadow Noir",
    description: "Deep shadow black, dark oxblood leather, and blind-justice crimson.",
    chips: ["#08080a", "#16161c", "#e11d48", "#f4f4f5"],
    contrastRatio: "18.23:1 (text) / 4.70:1 (btn)",
    wcagGrade: "AA",
  },
  "cobalt-web": {
    key: "cobalt-web",
    name: "Cobalt Web",
    subtitle: "Spider-Man-inspired Midnight Navy",
    description: "Midnight navy canvas, royal cobalt, dynamic vermilion red, and sky cyan.",
    chips: ["#080b14", "#141d33", "#dc2626", "#f1f5f9"],
    contrastRatio: "17.84:1 (text) / 4.83:1 (btn)",
    wcagGrade: "AA",
  },
};

/**
 * Type guard to verify whether an unknown value is a registered ThemeKey.
 */
export function isThemeKey(value: unknown): value is ThemeKey {
  return typeof value === "string" && (THEME_REGISTRY as readonly string[]).includes(value);
}

/**
 * Safe fallback resolver that guarantees returning a valid ThemeKey.
 * Returns DEFAULT_THEME ("obsidian-studio") if the value is missing, null, undefined,
 * or not present in THEME_REGISTRY.
 */
export function getValidThemeKey(value: unknown): ThemeKey {
  if (isThemeKey(value)) {
    return value;
  }
  return DEFAULT_THEME;
}
