import { NextResponse } from "next/server";
import { registerUser, RegistrationError, RegisterInput } from "@/lib/auth/register";
import { setSessionCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { error: "Unsupported Media Type: application/json is required" },
      {
        status: 415,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > 65536) {
    return NextResponse.json(
      { error: "Payload too large: maximum size is 64 KiB" },
      {
        status: 413,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON payload" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Invalid request body: object expected" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  try {
    const { user, session, rawToken } = await registerUser(body as RegisterInput);

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
      if (err.code === "USERNAME_TAKEN") {
        return NextResponse.json(
          { error: err.message },
          {
            status: 409,
            headers: { "Cache-Control": "no-store" },
          }
        );
      }
      return NextResponse.json(
        { error: err.message },
        {
          status: 400,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred during registration" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
