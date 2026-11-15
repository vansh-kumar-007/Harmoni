"use client";

import React from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ListMusic,
  Music2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePlayerStore } from "@/lib/player/store";
import { LicenseBadge } from "@/components/music/license-badge";
import { ProgressScrubber } from "./progress-scrubber";
import { VolumeControl } from "./volume-control";
import { QueueDrawer } from "./queue-drawer";

export function PlayerBar() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackState = usePlayerStore((s) => s.playbackState);
  const errorMessage = usePlayerStore((s) => s.errorMessage);
  const queue = usePlayerStore((s) => s.queue);
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);

  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const nextTrack = usePlayerStore((s) => s.nextTrack);
  const previousTrack = usePlayerStore((s) => s.previousTrack);
  const retry = usePlayerStore((s) => s.retry);
  const toggleQueueOpen = usePlayerStore((s) => s.toggleQueueOpen);

  const isPlaying = playbackState === "playing";
  const isLoading = playbackState === "loading";
  const isError = playbackState === "error";

  return (
    <>
      <footer
        role="region"
        aria-label="Audio player"
        className="fixed bottom-0 left-0 right-0 z-40 bg-player-bg border-t border-border shadow-2xl transition-all"
      >
        {/* Error notification banner if error occurs */}
        {isError && errorMessage && (
          <div
            role="alert"
            className="w-full bg-destructive/15 border-b border-destructive/30 px-4 py-1.5 flex items-center justify-between gap-2 text-xs text-destructive animate-in slide-in-from-top-1"
          >
            <div className="flex items-center gap-2 truncate">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-medium">{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive font-medium transition-colors shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6">
          {/* Left section: Artwork + Track details + License & Attribution */}
          <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
            <div className="w-12 h-12 rounded-lg bg-surface border border-border/80 overflow-hidden shrink-0 flex items-center justify-center">
              {currentTrack?.coverUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={currentTrack.coverUrl}
                  alt={`Cover artwork for ${currentTrack.title}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Music2 className="w-5 h-5 text-primary/70" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <p
                className="text-xs sm:text-sm font-semibold text-foreground truncate"
                title={currentTrack?.title || "No track selected"}
              >
                {currentTrack?.title || "No track selected"}
              </p>

              <p
                className="text-[11px] sm:text-xs text-muted-foreground truncate"
                title={currentTrack?.artistName || "Search music to listen"}
              >
                {currentTrack?.artistName || "Search music to start playback"}
              </p>

              {currentTrack && (
                <div className="flex items-center gap-2 pt-0.5">
                  <LicenseBadge license={currentTrack.license} />
                  <a
                    href={currentTrack.jamendoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 transition-colors"
                    title={`View "${currentTrack.title}" on Jamendo`}
                  >
                    <span>Jamendo</span>
                    <span className="text-[8px] opacity-70" aria-hidden="true">↗</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Center section: Playback transport buttons & Scrubber */}
          <div className="flex flex-col items-center gap-1.5 w-full md:w-1/2 max-w-xl">
            {/* Control buttons */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={previousTrack}
                disabled={!currentTrack}
                aria-label="Previous track"
                title="Previous track"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={togglePlayPause}
                disabled={!currentTrack && !isLoading}
                aria-label={
                  isLoading
                    ? "Loading audio stream"
                    : isPlaying
                    ? "Pause audio"
                    : "Play audio"
                }
                title={isPlaying ? "Pause" : "Play"}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary-hover flex items-center justify-center shadow-md active:scale-95 disabled:opacity-50 disabled:hover:bg-primary transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={nextTrack}
                disabled={!currentTrack && queue.length === 0}
                aria-label="Next track"
                title="Next track"
                className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-40 disabled:hover:bg-transparent transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Interactive Progress Scrubber */}
            <ProgressScrubber disabled={!currentTrack || isLoading} />
          </div>

          {/* Right section: Volume control & Queue toggle button */}
          <div className="flex items-center justify-end gap-3 w-full md:w-1/4">
            <VolumeControl />

            <div className="h-4 w-px bg-border/80 hidden sm:block" />

            <button
              type="button"
              onClick={toggleQueueOpen}
              aria-label={`Toggle playback queue, currently ${queue.length} track${queue.length === 1 ? "" : "s"} queued`}
              aria-expanded={isQueueOpen}
              title="Queue"
              className={`relative p-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
                isQueueOpen
                  ? "bg-primary-subtle text-primary border-primary/40"
                  : "bg-surface hover:bg-surface-hover text-muted-foreground hover:text-foreground border-border/80"
              }`}
            >
              <ListMusic className="w-4 h-4" />
              {queue.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-bold flex items-center justify-center shadow">
                  {queue.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </footer>

      {/* Slide-over Queue Drawer */}
      <QueueDrawer />
    </>
  );
}
