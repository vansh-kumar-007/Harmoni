import { NextResponse } from "next/server";
import { getSessionCookie, deleteSessionCookie } from "@/lib/auth/cookies";
import { revokeSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  try {
    const rawToken = await getSessionCookie();

    if (rawToken) {
      await revokeSession(rawToken);
    }

    await deleteSessionCookie();

    return NextResponse.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    // Ensure cookie is cleared even if database operation encounters an error
    await deleteSessionCookie().catch(() => {});

    return NextResponse.json(
      { error: "An unexpected error occurred during logout" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
