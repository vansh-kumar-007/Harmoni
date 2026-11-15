import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import {
  searchJamendoTracks,
  searchJamendoArtists,
  searchJamendoAlbums,
  isJamendoConfigured,
  JamendoError,
} from "@/lib/music/providers/jamendo";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  Pragma: "no-cache",
};

const SearchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(1, "Search query 'q' cannot be empty")
    .max(100, "Search query must not exceed 100 characters"),
  type: z.enum(["tracks", "artists", "albums"]).default("tracks"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).max(500).default(0),
});

export async function GET(request: Request): Promise<NextResponse> {
  // 1. Authenticate user via DAL
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to search music" },
      { status: 401, headers: NO_STORE_HEADERS }
    );
  }

  // 2. Parse and validate query parameters
  const url = new URL(request.url);
  const qParam = url.searchParams.get("q");
  if (qParam === null || !qParam.trim()) {
    return NextResponse.json(
      { success: false, error: "Search query 'q' is required and cannot be empty" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const rawParams = {
    q: qParam.trim(),
    type: url.searchParams.get("type") || "tracks",
    limit: url.searchParams.get("limit") || 20,
    offset: url.searchParams.get("offset") || 0,
  };

  const validation = SearchQuerySchema.safeParse(rawParams);
  if (!validation.success) {
    const errorMessage = validation.error.issues[0]?.message || "Invalid search parameters";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { q, type, limit, offset } = validation.data;

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

  // 4. Dispatch to provider based on search type
  try {
    let result;
    if (type === "tracks") {
      result = await searchJamendoTracks({ query: q, limit, offset });
    } else if (type === "artists") {
      result = await searchJamendoArtists({ query: q, limit, offset });
    } else {
      result = await searchJamendoAlbums({ query: q, limit, offset });
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200, headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    if (err instanceof JamendoError) {
      const status = err.statusCode || 502;
      return NextResponse.json(
        {
          success: false,
          configured: err.code !== "NOT_CONFIGURED",
          error: err.message,
        },
        { status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred while searching music. Please try again.",
      },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
