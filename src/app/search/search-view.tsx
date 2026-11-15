"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  SearchType,
  NormalizedTrack,
  NormalizedArtist,
  NormalizedAlbum,
} from "@/lib/music/types";
import { TrackCard } from "@/components/music/track-card";
import { ArtistCard } from "@/components/music/artist-card";
import { AlbumCard } from "@/components/music/album-card";

interface SearchViewProps {
  isConfigured: boolean;
  initialQuery?: string;
  initialType?: SearchType;
}

const SEARCH_TABS: { id: SearchType; label: string }[] = [
  { id: "tracks", label: "Tracks" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
];

const SUGGESTIONS = ["Ambient", "Chillout", "Acoustic", "Jazz", "Electronic", "Cinematic"];

export function SearchView({
  isConfigured: serverConfigured,
  initialQuery = "",
  initialType = "tracks",
}: SearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [activeType, setActiveType] = useState<SearchType>(initialType);
  const [status, setStatus] = useState<
    "idle" | "loading" | "loading-more" | "success" | "error" | "not-configured"
  >(serverConfigured ? "idle" : "not-configured");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [tracks, setTracks] = useState<NormalizedTrack[]>([]);
  const [artists, setArtists] = useState<NormalizedArtist[]>([]);
  const [albums, setAlbums] = useState<NormalizedAlbum[]>([]);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Execute Search
  const executeSearch = useCallback(
    async (searchQuery: string, type: SearchType, newOffset = 0, append = false) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setStatus("idle");
        setTracks([]);
        setArtists([]);
        setAlbums([]);
        setHasMore(false);
        setTotalCount(null);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      if (append) {
        setStatus("loading-more");
      } else {
        setStatus("loading");
        setErrorMessage(null);
      }

      try {
        const params = new URLSearchParams({
          q: trimmed,
          type,
          limit: "20",
          offset: String(newOffset),
        });

        const res = await fetch(`/api/music/search?${params.toString()}`, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: abortControllerRef.current.signal,
        });

        const data = await res.json();

        if (res.status === 503 || data.configured === false) {
          setStatus("not-configured");
          return;
        }

        if (!res.ok || !data.success) {
          setStatus("error");
          setErrorMessage(data.error || "Failed to search music");
          return;
        }

        const resultData = data.data;

        if (type === "tracks") {
          setTracks((prev) => (append ? [...prev, ...resultData.items] : resultData.items));
        } else if (type === "artists") {
          setArtists((prev) => (append ? [...prev, ...resultData.items] : resultData.items));
        } else {
          setAlbums((prev) => (append ? [...prev, ...resultData.items] : resultData.items));
        }

        setOffset(newOffset);
        setHasMore(resultData.hasMore);
        setTotalCount(resultData.totalCount);
        setStatus("success");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setStatus("error");
        setErrorMessage("Network error connecting to Harmoni search service.");
      }
    },
    []
  );

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query, activeType, 0, false);
  };

  // Tab switching
  const handleTabChange = (type: SearchType) => {
    if (type === activeType) return;
    setActiveType(type);
    if (query.trim()) {
      executeSearch(query, type, 0, false);
    }
  };

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const nextIndex = (index + 1) % SEARCH_TABS.length;
      handleTabChange(SEARCH_TABS[nextIndex].id);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prevIndex = (index - 1 + SEARCH_TABS.length) % SEARCH_TABS.length;
      handleTabChange(SEARCH_TABS[prevIndex].id);
    }
  };

  // Suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    executeSearch(suggestion, activeType, 0, false);
    searchInputRef.current?.focus();
  };

  // Load more
  const handleLoadMore = () => {
    executeSearch(query, activeType, offset + 20, true);
  };

  // Clear query
  const handleClear = () => {
    setQuery("");
    setStatus("idle");
    setTracks([]);
    setArtists([]);
    setAlbums([]);
    setHasMore(false);
    setTotalCount(null);
    searchInputRef.current?.focus();
  };

  // Perform initial search if query passed
  useEffect(() => {
    let ignore = false;
    if (initialQuery.trim() && serverConfigured) {
      void Promise.resolve().then(() => {
        if (!ignore) {
          executeSearch(initialQuery, initialType, 0, false);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [initialQuery, initialType, serverConfigured, executeSearch]);

  const activeResultsCount =
    activeType === "tracks"
      ? tracks.length
      : activeType === "artists"
      ? artists.length
      : albums.length;

  return (
    <div className="space-y-6">
      {/* Search Header & Input */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Discover Music
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Search tracks, independent artists, and albums licensed under Creative Commons.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="flex gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground">
              <span className="text-sm" aria-hidden="true">🔍</span>
            </div>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, artist, album, or genre..."
              aria-label="Search music catalog"
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-2xs"
            />
            {query && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear search input"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground cursor-pointer focus:outline-none"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "loading" || !query.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            {status === "loading" ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <span>Search</span>
            )}
          </button>
        </form>

        {/* Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <span className="text-[11px] font-medium mr-1">Suggestions:</span>
          {SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleSuggestionClick(tag)}
              className="px-2.5 py-1 rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/40 text-[11px] text-foreground transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border">
        <div
          role="tablist"
          aria-label="Search content categories"
          className="flex items-center gap-2"
        >
          {SEARCH_TABS.map((tab, idx) => {
            const isSelected = activeType === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onKeyDown={(e) => handleTabKeyDown(e, idx)}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-2 text-xs font-medium border-b-2 -mb-px transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-t-lg ${
                  isSelected
                    ? "border-primary text-primary font-semibold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels & Results */}
      <div
        role="tabpanel"
        id={`panel-${activeType}`}
        aria-labelledby={`tab-${activeType}`}
        className="space-y-4"
      >
        {/* State 1: Provider Not Configured */}
        {status === "not-configured" && (
          <div className="p-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden="true">⚠️</span>
              <div className="space-y-1">
                <h2 className="text-sm font-bold">Jamendo API Not Configured</h2>
                <p className="text-xs text-muted-foreground dark:text-amber-200/80 leading-relaxed">
                  Harmoni is ready to search and discover Creative Commons music, but the server-side Jamendo API client ID has not been set yet.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/80 text-foreground space-y-2 text-xs">
              <p className="font-semibold text-primary">How to enable Jamendo search locally (Free ₹0):</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground text-[11px] leading-relaxed">
                <li>
                  Create a free developer account at{" "}
                  <a
                    href="https://developer.jamendo.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    developer.jamendo.com
                  </a>{" "}
                  (strictly non-commercial, no payment card required).
                </li>
                <li>Register an application to receive your free <code className="font-mono bg-surface px-1 py-0.5 rounded">client_id</code>.</li>
                <li>
                  Add the variable to your local <code className="font-mono bg-surface px-1 py-0.5 rounded">.env.local</code> file:
                  <div className="mt-1 p-2 rounded-lg bg-surface font-mono text-[11px] text-foreground border border-border select-all">
                    JAMENDO_CLIENT_ID=&quot;your_free_jamendo_client_id_here&quot;
                  </div>
                </li>
                <li>Restart the Next.js development server to activate live search.</li>
              </ol>
            </div>
          </div>
        )}

        {/* State 2: Idle State */}
        {status === "idle" && (
          <div className="py-16 text-center space-y-3 border border-dashed border-border rounded-2xl bg-card/40">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-surface border border-border flex items-center justify-center text-primary text-xl">
              🎵
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              Ready to Discover Music
            </h2>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Type a search query above to explore thousands of Creative Commons licensed tracks, artists, and albums.
            </p>
          </div>
        )}

        {/* State 3: Loading Skeleton */}
        {status === "loading" && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading search results">
            {[1, 2, 3, 4, 5].map((key) => (
              <div
                key={key}
                className="p-4 rounded-xl border border-border bg-card animate-pulse flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 flex-1">
                  <div className="w-14 h-14 rounded-lg bg-surface" />
                  <div className="space-y-2 flex-1 max-w-xs">
                    <div className="h-3.5 bg-surface rounded w-3/4" />
                    <div className="h-3 bg-surface rounded w-1/2" />
                  </div>
                </div>
                <div className="w-24 h-6 bg-surface rounded" />
              </div>
            ))}
          </div>
        )}

        {/* State 4: Error State */}
        {status === "error" && (
          <div className="p-6 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive space-y-3 text-center">
            <span className="text-2xl" aria-hidden="true">⚠️</span>
            <div className="space-y-1">
              <h2 className="text-sm font-bold">Search Request Failed</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {errorMessage || "Unable to complete search request. Please try again."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => executeSearch(query, activeType, offset, false)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Retry Search
            </button>
          </div>
        )}

        {/* State 5: Success Results */}
        {(status === "success" || status === "loading-more") && (
          <div className="space-y-4">
            {/* Results Counter */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>
                Showing {activeResultsCount} {activeType}
                {totalCount ? ` of ${totalCount.toLocaleString()} found` : ""} for &quot;{query}&quot;
              </span>
              <span className="text-[11px] font-mono">Catalog: Jamendo v3.0</span>
            </div>

            {/* Empty Results within success */}
            {activeResultsCount === 0 ? (
              <div className="py-14 text-center space-y-2 border border-border rounded-2xl bg-card">
                <span className="text-2xl" aria-hidden="true">🔍</span>
                <h3 className="text-sm font-semibold text-foreground">
                  No {activeType} found
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  We couldn&apos;t find any {activeType} matching &quot;{query}&quot;. Try checking for typos or searching a different term.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeType === "tracks" &&
                  tracks.map((track) => (
                    <TrackCard key={track.id} track={track} />
                  ))}

                {activeType === "artists" &&
                  artists.map((artist) => (
                    <ArtistCard key={artist.id} artist={artist} />
                  ))}

                {activeType === "albums" &&
                  albums.map((album) => (
                    <AlbumCard key={album.id} album={album} />
                  ))}
              </div>
            )}

            {/* Pagination / Load More Button */}
            {hasMore && (
              <div className="pt-4 text-center">
                <button
                  type="button"
                  disabled={status === "loading-more"}
                  onClick={handleLoadMore}
                  className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center gap-2"
                >
                  {status === "loading-more" ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Loading more {activeType}...</span>
                    </>
                  ) : (
                    <span>Load More Results</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
