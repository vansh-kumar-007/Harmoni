import { NextResponse } from "next/server";
import { requireAdmin, AuthError } from "@/lib/auth/dal";
import { createInviteCode, createInviteSchema } from "@/lib/auth/invites";
import { parseOptionalJsonBody, jsonError, HttpError } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Enforce administrator authorization via DAL
  let adminUser;
  try {
    adminUser = await requireAdmin();
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      const status = err.code === "UNAUTHORIZED" ? 401 : 403;
      return jsonError(err.message, status);
    }
    return jsonError("Authorization error", 500);
  }

  // 2. Safely parse optional JSON body (defaulting to empty object if genuinely empty)
  let body: Record<string, unknown>;
  try {
    body = await parseOptionalJsonBody(request, {});
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    return jsonError("Malformed JSON payload", 400);
  }

  const parsed = createInviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Invalid invitation parameters",
      400
    );
  }

  // 3. Create invitation record and return raw code exactly once
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
    // Log detailed failure server-side without exposing internal details to the client
    console.error("[ERROR] Failed to create invitation:", err);
    return jsonError("An unexpected error occurred while creating the invitation", 500);
  }
}
