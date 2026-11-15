import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isJamendoConfigured } from "@/lib/music/providers/jamendo";
import { SearchView } from "./search-view";
import type { SearchType } from "@/lib/music/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Discover Music — Harmoni",
  description: "Search and explore Creative Commons tracks, artists, and albums.",
};

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
  }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  // 1. Enforce authenticated user session via DAL
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?returnTo=/search");
  }

  // 2. Check server-side Jamendo provider configuration
  const isConfigured = isJamendoConfigured();

  // 3. Await searchParams in Next.js 16 App Router
  const params = await searchParams;
  const initialQuery = typeof params?.q === "string" ? params.q.trim() : "";
  const rawType = params?.type;
  const initialType: SearchType =
    rawType === "artists" || rawType === "albums" ? rawType : "tracks";

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
      <SearchView
        isConfigured={isConfigured}
        initialQuery={initialQuery}
        initialType={initialType}
      />
    </main>
  );
}
