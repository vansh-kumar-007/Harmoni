import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { usernameSchema, passwordSchema, verifyPassword, DUMMY_PASSWORD_HASH } from "@/lib/auth/password";
import { createSession, toSafeUser } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";
import { parseJsonBody, jsonError, HttpError } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

/**
 * Reuses existing canonical Zod schemas from password.ts.
 * Normalizes username to lowercase and validates bounds.
 */
const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

const GENERIC_AUTH_ERROR = "Invalid username or password";

export async function POST(request: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await parseJsonBody(request);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    return jsonError("Malformed JSON payload", 400);
  }

  const parsed = loginSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid credentials format", 400);
  }

  const { username: normalizedUsername, password } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      // Execute dummy Argon2id verification with same parameters to eliminate timing side-channel
      await verifyPassword(password, DUMMY_PASSWORD_HASH);
      return jsonError(GENERIC_AUTH_ERROR, 401);
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return jsonError(GENERIC_AUTH_ERROR, 401);
    }

    // Create session in PostgreSQL
    const { session, rawToken } = await createSession(user.id);

    // Issue HTTP-only session cookie
    await setSessionCookie(rawToken, session.expiresAt);

    return NextResponse.json(
      {
        success: true,
        user: toSafeUser(user),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return jsonError("An unexpected error occurred during authentication", 500);
  }
}
