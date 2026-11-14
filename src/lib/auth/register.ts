import "server-only";
import { z } from "zod";
import db from "@/lib/db";
import { hashPassword, usernameSchema, displayNameSchema, passwordSchema } from "./password";
import { hashInviteCode, inviteCodeSchema } from "./invites";
import { createSession, toSafeUser, SafeUser } from "./session";

/**
 * Registration error domain with structured error codes.
 */
export class RegistrationError extends Error {
  code: "INVALID_INVITE" | "USERNAME_TAKEN" | "VALIDATION_ERROR";

  constructor(message: string, code: "INVALID_INVITE" | "USERNAME_TAKEN" | "VALIDATION_ERROR") {
    super(message);
    this.name = "RegistrationError";
    this.code = code;
  }
}

/**
 * Zod schema validating the entire registration payload.
 */
export const registerSchema = z.object({
  inviteCode: inviteCodeSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Executes atomic user registration and single-use invitation consumption.
 *
 * CRITICAL ARCHITECTURAL INVARIANT:
 * User creation, conditional invitation redemption, and session creation are
 * executed within a SINGLE atomic Prisma transaction.
 *
 * If invitation redemption fails (expired, nonexistent, or already consumed by
 * another user), the transaction is immediately rolled back, guaranteeing that
 * no orphaned user or session record is persisted.
 *
 * @param input Plain registration payload
 * @returns Sanitized SafeUser, created session metadata, and the raw session token
 */
export async function registerUser(input: RegisterInput): Promise<{
  user: SafeUser;
  session: { id: string; userId: string; expiresAt: Date; createdAt: Date };
  rawToken: string;
}> {
  // Validate input schema
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new RegistrationError(
      parsed.error.issues[0]?.message || "Invalid registration data",
      "VALIDATION_ERROR"
    );
  }

  const { inviteCode, username, displayName, password } = parsed.data;
  const codeHash = hashInviteCode(inviteCode);

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Pre-check username availability
      const existingUser = await tx.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existingUser) {
        throw new RegistrationError("Username is already taken", "USERNAME_TAKEN");
      }

      // 2. Hash password with Argon2id
      const passwordHash = await hashPassword(password);

      // 3. Create the user record
      const createdUser = await tx.user.create({
        data: {
          username,
          displayName,
          passwordHash,
          role: "USER",
        },
      });

      // 4. Atomically redeem the invitation code
      // Requires: codeHash matches, usedById IS NULL, expiresAt IS NULL OR expiresAt > NOW()
      const now = new Date();
      const inviteUpdate = await tx.inviteCode.updateMany({
        where: {
          codeHash,
          usedById: null,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } },
          ],
        },
        data: {
          usedById: createdUser.id,
        },
      });

      // 5. Verify that exactly one invitation was updated
      if (inviteUpdate.count !== 1) {
        throw new RegistrationError(
          "Invalid, expired, or already-redeemed invitation code",
          "INVALID_INVITE"
        );
      }

      // 6. Create session inside the same transaction
      const sessionResult = await createSession(createdUser.id, tx);

      return {
        user: toSafeUser(createdUser),
        session: sessionResult.session,
        rawToken: sessionResult.rawToken,
      };
    });

    return result;
  } catch (err: unknown) {
    if (err instanceof RegistrationError) {
      throw err;
    }
    // Handle concurrent username collision (Prisma P2002) cleanly
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      throw new RegistrationError("Username is already taken", "USERNAME_TAKEN");
    }
    throw err;
  }
}
