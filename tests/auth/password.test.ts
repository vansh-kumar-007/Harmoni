import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  usernameSchema,
  displayNameSchema,
  passwordSchema,
  ARGON2ID_OPTIONS,
} from "@/lib/auth/password";

describe("Password Security & Argon2id Implementation", () => {
  it("uses the OWASP-recommended parameters", () => {
    expect(ARGON2ID_OPTIONS.memoryCost).toBe(19456); // 19 MiB
    expect(ARGON2ID_OPTIONS.timeCost).toBe(2); // 2 iterations
    expect(ARGON2ID_OPTIONS.parallelism).toBe(1); // 1 thread
    expect(ARGON2ID_OPTIONS.outputLen).toBe(32); // 256 bits
    expect(ARGON2ID_OPTIONS.algorithm).toBe(2); // Argon2id
  });

  it("hashes password into a valid Argon2id PHC format", async () => {
    const plain = "CorrectHorseBatteryStaple_2026!";
    const hash = await hashPassword(plain);

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
    expect(hash).not.toContain(plain);
  });

  it("verifies correct password successfully", async () => {
    const plain = "Secur3_P@ssw0rd_Test!";
    const hash = await hashPassword(plain);

    const isValid = await verifyPassword(plain, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const plain = "Secur3_P@ssw0rd_Test!";
    const hash = await hashPassword(plain);

    const isValid = await verifyPassword("WrongPassword123!", hash);
    expect(isValid).toBe(false);
  });

  it("generates unique cryptographically secure salts for identical passwords", async () => {
    const plain = "IdenticalPassword_123!";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);

    expect(hash1).not.toBe(hash2);
    expect(await verifyPassword(plain, hash1)).toBe(true);
    expect(await verifyPassword(plain, hash2)).toBe(true);
  });

  it("enforces password minimum length of 8 characters", () => {
    expect(() => passwordSchema.parse("short7!")).toThrow();
    expect(passwordSchema.parse("valid8ch!")).toBe("valid8ch!");
  });

  it("supports long passwords without silent truncation", async () => {
    const longPassphrase = "a".repeat(250) + "_SafePassphrase123!";
    expect(passwordSchema.parse(longPassphrase)).toBe(longPassphrase);

    const hash = await hashPassword(longPassphrase);
    expect(await verifyPassword(longPassphrase, hash)).toBe(true);
  });

  it("normalizes and validates usernames", () => {
    expect(usernameSchema.parse(" Harmoni_User-01 ")).toBe("harmoni_user-01");
    expect(usernameSchema.parse("alice")).toBe("alice");
    expect(usernameSchema.parse("bob-99")).toBe("bob-99");

    // Rejection tests
    expect(() => usernameSchema.parse("ab")).toThrow(); // Under 3 chars
    expect(() => usernameSchema.parse("a".repeat(31))).toThrow(); // Over 30 chars
    expect(() => usernameSchema.parse("-badleading")).toThrow(); // Leading hyphen
    expect(() => usernameSchema.parse("badtrailing-")).toThrow(); // Trailing hyphen
    expect(() => usernameSchema.parse("bad@symbol")).toThrow(); // Disallowed symbol
  });

  it("validates display names", () => {
    expect(displayNameSchema.parse(" Alice Smith ")).toBe("Alice Smith");
    expect(() => displayNameSchema.parse("")).toThrow();
    expect(() => displayNameSchema.parse("a".repeat(51))).toThrow();
  });

  it("handles malformed hash strings gracefully without throwing", async () => {
    expect(await verifyPassword("password", "")).toBe(false);
    expect(await verifyPassword("password", "invalid_hash_string")).toBe(false);
    expect(await verifyPassword("password", "$2a$12$notAnArgonHash")).toBe(false);
  });
});
