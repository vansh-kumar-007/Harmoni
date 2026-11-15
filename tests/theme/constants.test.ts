import { describe, it, expect } from "vitest";
import {
  THEME_REGISTRY,
  DEFAULT_THEME,
  THEMES_META,
  isThemeKey,
  getValidThemeKey,
  type ThemeKey,
} from "@/lib/theme/constants";

describe("Theme System Registry & Constants", () => {
  it("defines exactly the five approved themes in the registry", () => {
    expect(THEME_REGISTRY).toEqual([
      "obsidian-studio",
      "nordic-aurora",
      "editorial-vinyl",
      "crimson-vigil",
      "cobalt-web",
    ]);
    expect(THEME_REGISTRY.length).toBe(5);
  });

  it("sets obsidian-studio as the default theme", () => {
    expect(DEFAULT_THEME).toBe("obsidian-studio");
  });

  it("accepts all five valid theme keys with isThemeKey type guard", () => {
    for (const key of THEME_REGISTRY) {
      expect(isThemeKey(key)).toBe(true);
    }
  });

  it("rejects invalid, unknown, or non-string values with isThemeKey", () => {
    expect(isThemeKey("unknown-theme")).toBe(false);
    expect(isThemeKey("")).toBe(false);
    expect(isThemeKey(null)).toBe(false);
    expect(isThemeKey(undefined)).toBe(false);
    expect(isThemeKey(123)).toBe(false);
    expect(isThemeKey({})).toBe(false);
    expect(isThemeKey(["obsidian-studio"])).toBe(false);
    expect(isThemeKey("OBSIDIAN-STUDIO")).toBe(false);
  });

  it("safely resolves valid theme keys with getValidThemeKey", () => {
    for (const key of THEME_REGISTRY) {
      expect(getValidThemeKey(key)).toBe(key);
    }
  });

  it("falls back to obsidian-studio for missing, null, undefined, or invalid values", () => {
    expect(getValidThemeKey(null)).toBe("obsidian-studio");
    expect(getValidThemeKey(undefined)).toBe("obsidian-studio");
    expect(getValidThemeKey("")).toBe("obsidian-studio");
    expect(getValidThemeKey("invalid-theme")).toBe("obsidian-studio");
    expect(getValidThemeKey(42)).toBe("obsidian-studio");
    expect(getValidThemeKey({ theme: "nordic-aurora" })).toBe("obsidian-studio");
  });

  it("provides complete metadata for every registered theme", () => {
    for (const key of THEME_REGISTRY) {
      const meta = THEMES_META[key as ThemeKey];
      expect(meta).toBeDefined();
      expect(meta.key).toBe(key);
      expect(meta.name).toBeTypeOf("string");
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.subtitle).toBeTypeOf("string");
      expect(meta.subtitle.length).toBeGreaterThan(0);
      expect(meta.description).toBeTypeOf("string");
      expect(meta.description.length).toBeGreaterThan(0);
      expect(Array.isArray(meta.chips)).toBe(true);
      expect(meta.chips.length).toBe(4);
      for (const chip of meta.chips) {
        expect(chip).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
      expect(meta.contrastRatio).toBeTypeOf("string");
      expect(["AAA", "AA"]).toContain(meta.wcagGrade);
    }
  });
});
