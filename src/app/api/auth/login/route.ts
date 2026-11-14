import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, toSafeUser } from "@/lib/auth/session";
import { setSessionCookie } from "@/lib/auth/cookies";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const GENERIC_AUTH_ERROR = "Invalid username or password";

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid credentials format" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const { username, password } = parsed.data;
  const normalizedUsername = username.toLowerCase();

  try {
    const user = await db.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (!user) {
      // Prevent user enumeration: identical response
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: GENERIC_AUTH_ERROR },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
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
    return NextResponse.json(
      { error: "An unexpected error occurred during authentication" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
