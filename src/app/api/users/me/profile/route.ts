import { NextResponse } from "next/server";
import { z } from "zod";
import db from "@/lib/db";
import { requireUser, AuthError } from "@/lib/auth/dal";
import { toSafeUser } from "@/lib/auth/session";
import { AVATAR_REGISTRY, MAX_BIO_LENGTH } from "@/lib/profile/constants";
import { parseJsonBody, jsonError, HttpError } from "@/lib/auth/http";

export const dynamic = "force-dynamic";

const updateProfileSchema = z
  .object({
    avatarKey: z
      .enum(AVATAR_REGISTRY, {
        message: "Invalid avatar selection. Must be one of the registered avatar presets.",
      })
      .optional(),
    bio: z
      .string()
      .max(MAX_BIO_LENGTH, `Biography must not exceed ${MAX_BIO_LENGTH} characters.`)
      .nullable()
      .optional(),
  })
  .refine((data) => data.avatarKey !== undefined || data.bio !== undefined, {
    message: "At least one profile field (avatarKey or bio) must be provided.",
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

  // 2. Parse JSON body with strict size (64 KiB) and Content-Type enforcement
  let rawBody: unknown;
  try {
    rawBody = await parseJsonBody(request);
  } catch (err: unknown) {
    if (err instanceof HttpError) {
      return jsonError(err.message, err.status);
    }
    return jsonError("Malformed JSON payload", 400);
  }

  // 3. Validate payload schema against permitted fields
  const parsed = updateProfileSchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message || "Invalid profile data format",
      400
    );
  }

  const { avatarKey, bio } = parsed.data;

  // 4. Normalize biography: empty string or whitespace-only becomes null
  const normalizedBio = bio !== undefined ? (bio === null || bio.trim().length === 0 ? null : bio.trim()) : undefined;

  // Build targeted update data object
  const updateData: { avatarKey?: string; bio?: string | null } = {};
  if (avatarKey !== undefined) {
    updateData.avatarKey = avatarKey;
  }
  if (bio !== undefined) {
    updateData.bio = normalizedBio;
  }

  // 5. Update profile strictly for the authenticated user
  try {
    const updatedUser = await db.user.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    return NextResponse.json(
      {
        success: true,
        user: toSafeUser(updatedUser),
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    console.error("[ERROR] Failed to update user profile: database update failed");
    return jsonError("An unexpected error occurred while updating your profile", 500);
  }
}
