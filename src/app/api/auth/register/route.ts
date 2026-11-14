import { NextResponse } from "next/server";
import { registerUser, RegistrationError, RegisterInput } from "@/lib/auth/register";
import { setSessionCookie } from "@/lib/auth/cookies";
import { parseJsonBody, jsonError, HttpError } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let body: RegisterInput;
  try {
    body = await parseJsonBody<RegisterInput>(request);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    return jsonError("Malformed JSON payload", 400);
  }

  try {
    const { user, session, rawToken } = await registerUser(body);

    // Issue HTTP-only session cookie
    await setSessionCookie(rawToken, session.expiresAt);

    return NextResponse.json(
      {
        success: true,
        user,
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    if (err instanceof RegistrationError) {
      const status = err.code === "USERNAME_TAKEN" ? 409 : 400;
      return jsonError(err.message, status);
    }

    return jsonError("An unexpected error occurred during registration", 500);
  }
}
