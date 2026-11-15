import { describe, it, expect } from "vitest";
import {
  AVATAR_REGISTRY,
  DEFAULT_AVATAR,
  MAX_BIO_LENGTH,
  AVATARS_META,
  isAvatarKey,
  getValidAvatarKey,
  type AvatarKey,
} from "@/lib/profile/constants";

describe("Avatar Presets & Profile Constants", () => {
  it("defines exactly the 8 approved avatar keys in the registry", () => {
    expect(AVATAR_REGISTRY).toEqual([
      "avatar_1",
      "avatar_2",
      "avatar_3",
      "avatar_4",
      "avatar_5",
      "avatar_6",
      "avatar_7",
      "avatar_8",
    ]);
    expect(AVATAR_REGISTRY.length).toBe(8);
  });

  it("sets avatar_1 as the default avatar preset", () => {
    expect(DEFAULT_AVATAR).toBe("avatar_1");
  });

  it("defines MAX_BIO_LENGTH as 250 characters", () => {
    expect(MAX_BIO_LENGTH).toBe(250);
  });

  it("accepts all 8 registered avatar keys with isAvatarKey", () => {
    for (const key of AVATAR_REGISTRY) {
      expect(isAvatarKey(key)).toBe(true);
    }
  });

  it("rejects invalid, unknown, or non-string values with isAvatarKey", () => {
    expect(isAvatarKey("avatar_9")).toBe(false);
    expect(isAvatarKey("avatar_0")).toBe(false);
    expect(isAvatarKey("")).toBe(false);
    expect(isAvatarKey(null)).toBe(false);
    expect(isAvatarKey(undefined)).toBe(false);
    expect(isAvatarKey(123)).toBe(false);
    expect(isAvatarKey({})).toBe(false);
    expect(isAvatarKey(["avatar_1"])).toBe(false);
    expect(isAvatarKey("AVATAR_1")).toBe(false);
  });

  it("safely resolves valid avatar keys with getValidAvatarKey", () => {
    for (const key of AVATAR_REGISTRY) {
      expect(getValidAvatarKey(key)).toBe(key);
    }
  });

  it("falls back to avatar_1 for null, undefined, unknown, or invalid keys", () => {
    expect(getValidAvatarKey(null)).toBe("avatar_1");
    expect(getValidAvatarKey(undefined)).toBe("avatar_1");
    expect(getValidAvatarKey("")).toBe("avatar_1");
    expect(getValidAvatarKey("avatar_unknown")).toBe("avatar_1");
    expect(getValidAvatarKey(99)).toBe("avatar_1");
    expect(getValidAvatarKey({ key: "avatar_2" })).toBe("avatar_1");
  });

  it("provides complete metadata for every registered avatar", () => {
    for (const key of AVATAR_REGISTRY) {
      const meta = AVATARS_META[key as AvatarKey];
      expect(meta).toBeDefined();
      expect(meta.key).toBe(key);
      expect(meta.name).toBeTypeOf("string");
      expect(meta.name.length).toBeGreaterThan(0);
      expect(meta.concept).toBeTypeOf("string");
      expect(meta.concept.length).toBeGreaterThan(0);
      expect(meta.description).toBeTypeOf("string");
      expect(meta.description.length).toBeGreaterThan(0);
    }
  });
});
