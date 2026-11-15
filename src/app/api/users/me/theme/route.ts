import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/dal";
import { THEME_REGISTRY } from "@/lib/theme/constants";
import { parseJsonBody, jsonError, HttpError } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

const updateThemeSchema = z.object({
  themeKey: z.enum(THEME_REGISTRY, {
    message: "Invalid theme identifier. Must be one of the registered theme keys.",
  }),
});

export async function PATCH(request: Request): Promise<NextResponse> {
  // 1. Enforce user authentication via DAL
  let currentUser;
  try {
    currentUser = await requireUser();
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return jsonError(err.message, 401);
    }
    return jsonError("Authentication error", 500);
  }

  // 2. Parse JSON body with strict size and Content-Type enforcement
  let rawBody: unknown;
  try {
    rawBody = await parseJsonBody(request);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    return jsonError("Malformed JSON payload", 400);
  }

  // 3. Validate payload schema against centralized THEME_REGISTRY
  const parsed = updateThemeSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Invalid theme selection",
      400
    );
  }

  const { themeKey } = parsed.data;

  // 4. Update preference strictly for the authenticated user
  try {
    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: { themeKey },
      select: {
        id: true,
        themeKey: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        themeKey: updatedUser.themeKey,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    console.error("[ERROR] Failed to update user theme preference: database update failed");
    return jsonError("An unexpected error occurred while saving your theme preference", 500);
  }
}
