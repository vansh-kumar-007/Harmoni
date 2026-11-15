import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  resolveJamendoTrackStream,
  isJamendoConfigured,
  JamendoError,
} from "@/lib/music/providers/jamendo";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

export async function GET(request: Request): Promise<NextResponse> {
  // 1. Authenticate user via custom DAL
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to stream music" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // 2. Parse and validate trackId query parameter
  const url = new URL(request.url);
  const trackIdParam = url.searchParams.get("trackId")?.trim();

  if (!trackIdParam) {
    return NextResponse.json(
      { success: false, error: "Query parameter 'trackId' is required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!/^\d+$/.test(trackIdParam)) {
    return NextResponse.json(
      { success: false, error: "Track ID must be a positive integer" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  // 3. Verify provider configuration
  if (!isJamendoConfigured()) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        error:
          "Jamendo music provider is not configured. Please set JAMENDO_CLIENT_ID in your local .env.local file.",
      },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }

  // 4. Resolve stream URL from provider
  try {
    const streamData = await resolveJamendoTrackStream(trackIdParam);

    return NextResponse.json(
      {
        success: true,
        data: streamData,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    if (err instanceof JamendoError) {
      const status = err.statusCode || 502;
      return NextResponse.json(
        {
          success: false,
          configured:
            err.code !== "NOT_CONFIGURED" && err.code !== "INVALID_CREDENTIALS",
          error: err.message,
        },
        { status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while resolving audio stream. Please try again.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
