import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/dal";
import { createInviteCode, createInviteSchema } from "@/lib/auth/invites";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Enforce administrator authorization via DAL
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      const status = err.code === "UNAUTHORIZED" ? 401 : 403;
      return NextResponse.json(
        { error: err.message },
        {
          status,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }
    return NextResponse.json(
      { error: "Authorization error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  // 2. Parse optional request body for custom expiration
  let body: unknown = {};
  const contentType = request.headers.get("content-type");
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

  if (contentType && contentType.toLowerCase().includes("application/json")) {
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
  }

  const parsed = createInviteSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid invitation parameters" },
      {
        status: 400,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  try {
    const { invite, rawCode } = await createInviteCode({
      createdById: adminUser.id,
      expiresInDays: parsed.data?.expiresInDays,
    });

    return NextResponse.json(
      {
        success: true,
        invite: {
          id: invite.id,
          inviteCode: rawCode,
          expiresAt: invite.expiresAt,
          createdAt: invite.createdAt,
        },
      },
      {
        status: 201,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create invitation";
    return NextResponse.json(
      { error: message },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
