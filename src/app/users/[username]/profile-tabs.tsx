"use client";

import React, { useState } from "react";

interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  createdAt: Date;
  _count: {
    tracks: number;
  };
}

interface ScrobbleSummary {
  id: string;
  listenedAt: Date;
  track: {
    id: string;
    title: string;
    artistName: string;
    albumName: string | null;
    durationMs: number;
    coverUrl: string | null;
  };
}

interface ProfileTabsProps {
  username: string;
  isOwner: boolean;
  publicPlaylists: PlaylistSummary[];
  recentScrobbles: ScrobbleSummary[];
  totalScrobbles: number;
}

export function ProfileTabs({
  username,
  isOwner,
  publicPlaylists,
  recentScrobbles,
  totalScrobbles,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "playlists" | "history">("overview");

  const formatListenedDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Profile Sections"
        className="flex items-center gap-2 border-b border-border pb-px"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "overview"}
          aria-controls="tab-overview-content"
          id="tab-overview"
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px ${
            activeTab === "overview"
              ? "border-primary text-foreground bg-surface/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Overview
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "playlists"}
          aria-controls="tab-playlists-content"
          id="tab-playlists"
          onClick={() => setActiveTab("playlists")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === "playlists"
              ? "border-primary text-foreground bg-surface/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Playlists</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
            {publicPlaylists.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "history"}
          aria-controls="tab-history-content"
          id="tab-history"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === "history"
              ? "border-primary text-foreground bg-surface/40"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <span>Listening History</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-muted font-mono">
            {totalScrobbles}
          </span>
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div
          role="tabpanel"
          id="tab-overview-content"
          aria-labelledby="tab-overview"
          className="space-y-8"
        >
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Scrobbles
              </span>
              <span className="text-2xl font-bold text-foreground mt-1 block">
                {totalScrobbles.toLocaleString()}
              </span>
              <span className="text-[11px] text-muted-foreground/80 mt-0.5 block">
                Completed playback events
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Public Playlists
              </span>
              <span className="text-2xl font-bold text-foreground mt-1 block">
                {publicPlaylists.length}
              </span>
              <span className="text-[11px] text-muted-foreground/80 mt-0.5 block">
                Shared listening collections
              </span>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Platform Circle
              </span>
              <span className="text-2xl font-bold text-primary mt-1 block">
                Harmoni
              </span>
              <span className="text-[11px] text-muted-foreground/80 mt-0.5 block">
                Private circle member
              </span>
            </div>
          </div>

          {/* Recent Listening Stream */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Recent Listening Activity
              </h3>
              {recentScrobbles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View full history →
                </button>
              )}
            </div>

            {recentScrobbles.length === 0 ? (
              <div className="p-8 rounded-xl border border-border/80 bg-surface/30 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center text-primary text-base font-bold">
                  ♪
                </div>
                <h4 className="text-xs font-semibold text-foreground">
                  No scrobbles logged yet
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  {isOwner
                    ? "Your completed listening history will appear here once you play tracks for at least 50% duration or 30 seconds."
                    : `@${username} has not logged any completed playback scrobbles yet.`}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
                {recentScrobbles.map((scrobble) => (
                  <div
                    key={scrobble.id}
                    className="p-3.5 flex items-center justify-between hover:bg-surface-hover/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/60">
                        ♪
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-foreground truncate">
                          {scrobble.track.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {scrobble.track.artistName}
                          {scrobble.track.albumName ? ` · ${scrobble.track.albumName}` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-4">
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {formatListenedDate(scrobble.listenedAt)}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground/60">
                        {formatDuration(scrobble.track.durationMs)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Public Playlists Preview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Public Playlists
              </h3>
              {publicPlaylists.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("playlists")}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  View all ({publicPlaylists.length}) →
                </button>
              )}
            </div>

            {publicPlaylists.length === 0 ? (
              <div className="p-8 rounded-xl border border-border/80 bg-surface/30 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-muted flex items-center justify-center text-primary text-base font-bold">
                  ☰
                </div>
                <h4 className="text-xs font-semibold text-foreground">
                  No public playlists created
                </h4>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  {isOwner
                    ? "Create public playlists to share curated tracks with your friends."
                    : `@${username} has not shared any public playlists yet.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {publicPlaylists.slice(0, 3).map((pl) => (
                  <div
                    key={pl.id}
                    className="p-4 rounded-xl border border-border bg-card space-y-2 hover:border-primary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary font-bold border border-border">
                      ♫
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {pl.title}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {pl.description || "Curated playlist collection"}
                      </p>
                    </div>
                    <div className="text-[10px] font-mono text-muted-foreground pt-1 flex items-center justify-between border-t border-border/60">
                      <span>{pl._count.tracks} tracks</span>
                      <span>Public</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PLAYLISTS TAB */}
      {activeTab === "playlists" && (
        <div
          role="tabpanel"
          id="tab-playlists-content"
          aria-labelledby="tab-playlists"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              Public Playlists ({publicPlaylists.length})
            </h3>
            <p className="text-xs text-muted-foreground">
              Private playlists are excluded for privacy.
            </p>
          </div>

          {publicPlaylists.length === 0 ? (
            <div className="p-12 rounded-xl border border-border bg-card text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-primary text-xl font-bold">
                ☰
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                No public playlists
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isOwner
                  ? "You have not published any public playlists. Playlists can be shared with your circle in Milestone 6."
                  : `@${username} does not currently have any public playlists.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {publicPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="p-5 rounded-xl border border-border bg-card hover:bg-surface-hover/60 transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center text-primary text-lg font-bold border border-border">
                      ♫
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        {pl.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-3 mt-1">
                        {pl.description || "Curated playlist collection on Harmoni."}
                      </p>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-muted-foreground pt-3 border-t border-border/60 flex items-center justify-between">
                    <span>{pl._count.tracks} tracks</span>
                    <span>
                      {new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(
                        new Date(pl.createdAt)
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div
          role="tabpanel"
          id="tab-history-content"
          aria-labelledby="tab-history"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">
                Listening History
              </h3>
              <p className="text-xs text-muted-foreground">
                Completed scrobbles conforming to the 50% or 30-second listening threshold.
              </p>
            </div>
            <span className="text-xs font-mono text-primary bg-primary-subtle px-2.5 py-1 rounded-md border border-primary/20">
              {totalScrobbles} Total
            </span>
          </div>

          {recentScrobbles.length === 0 ? (
            <div className="p-12 rounded-xl border border-border bg-card text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-primary text-xl font-bold">
                ♪
              </div>
              <h4 className="text-sm font-semibold text-foreground">
                No listening history yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                {isOwner
                  ? "When you listen to tracks on Harmoni, completed playback events are recorded here automatically."
                  : `@${username} has not scrobbled any completed playback sessions.`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60 rounded-xl border border-border bg-card overflow-hidden">
              {recentScrobbles.map((scrobble) => (
                <div
                  key={scrobble.id}
                  className="p-4 flex items-center justify-between hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center text-primary text-sm font-bold shrink-0 border border-border/80">
                      ♪
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {scrobble.track.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {scrobble.track.artistName}
                        {scrobble.track.albumName ? ` · ${scrobble.track.albumName}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-4">
                    <div className="text-xs font-medium text-foreground">
                      {formatListenedDate(scrobble.listenedAt)}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      {formatDuration(scrobble.track.durationMs)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
