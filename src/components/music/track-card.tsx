"use client";

import React, { useState } from "react";
import { Play, Pause, Plus, Check, Loader2 } from "lucide-react";
import type { NormalizedTrack } from "@/lib/music/types";
import { usePlayerStore } from "@/lib/player/store";
import { LicenseBadge } from "./license-badge";

interface TrackCardProps {
  track: NormalizedTrack;
}

export function TrackCard({ track }: TrackCardProps) {
  const [imageError, setImageError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackState = usePlayerStore((s) => s.playbackState);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const togglePlayPause = usePlayerStore((s) => s.togglePlayPause);
  const addToQueue = usePlayerStore((s) => s.addToQueue);

  const isCurrentTrack = currentTrack?.id === track.id;
  const isPlaying = isCurrentTrack && playbackState === "playing";
  const isLoading = isCurrentTrack && playbackState === "loading";
  const isPlayable = track.license.isVerified;

  const handlePlayClick = () => {
    if (!isPlayable) return;
    if (isCurrentTrack) {
      togglePlayPause();
    } else {
      playTrack(track);
    }
  };

  const handleAddToQueue = () => {
    if (!isPlayable) return;
    addToQueue(track);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <article className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-surface-hover transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Artwork + Title/Artist/Album Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Cover Artwork with Quick Play overlay */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-surface flex items-center justify-center">
          {track.coverUrl && !imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={track.coverUrl}
              alt={`Cover artwork for ${track.title}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <span className="text-primary font-bold text-lg select-none" aria-hidden="true">
              ♫
            </span>
          )}

          {isPlayable && (
            <button
              type="button"
              onClick={handlePlayClick}
              aria-label={isPlaying ? `Pause ${track.title}` : `Play ${track.title}`}
              className={`absolute inset-0 bg-black/40 flex items-center justify-center text-white transition-opacity ${
                isPlaying || isLoading
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus:opacity-100"
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Text Metadata */}
        <div className="min-w-0 space-y-1">
          <h3
            className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            title={track.title}
          >
            {track.title}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/90 truncate max-w-[180px]" title={track.artistName}>
              {track.artistName}
            </span>
            <span aria-hidden="true">•</span>
            {track.albumTitle ? (
              <span className="truncate max-w-[160px]" title={track.albumTitle}>
                {track.albumTitle}
              </span>
            ) : (
              <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-surface border border-border text-muted-foreground/80">
                Single
              </span>
            )}
            <span aria-hidden="true">•</span>
            <span className="font-mono text-[11px]">{track.durationFormatted}</span>
          </div>
        </div>
      </div>

      {/* Middle/Right: Playback Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handlePlayClick}
          disabled={!isPlayable}
          title={
            !isPlayable
              ? "Playback unavailable: unverified license"
              : isPlaying
              ? "Pause playback"
              : "Play now"
          }
          aria-label={
            !isPlayable
              ? "Playback unavailable: unverified license"
              : isPlaying
              ? `Pause ${track.title}`
              : `Play ${track.title}`
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !isPlayable
              ? "bg-surface border border-border/80 text-muted-foreground/50 cursor-not-allowed"
              : isPlaying
              ? "bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs"
              : "bg-surface hover:bg-surface-hover border border-border text-foreground hover:text-primary shadow-2xs active:scale-95"
          }`}
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isPlaying ? "Pause" : "Play Now"}</span>
        </button>

        <button
          type="button"
          onClick={handleAddToQueue}
          disabled={!isPlayable}
          title={
            !isPlayable
              ? "Playback unavailable: unverified license"
              : justAdded
              ? "Added to queue"
              : "Add to queue"
          }
          aria-label={
            !isPlayable
              ? "Playback unavailable: unverified license"
              : `Add ${track.title} to queue`
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !isPlayable
              ? "bg-surface border border-border/80 text-muted-foreground/50 cursor-not-allowed"
              : justAdded
              ? "bg-success/20 text-success border border-success/30"
              : "bg-surface hover:bg-surface-hover border border-border text-muted-foreground hover:text-foreground shadow-2xs active:scale-95"
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Added</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Queue</span>
            </>
          )}
        </button>
      </div>

      {/* Right: Licensing & Jamendo Attribution */}
      <div className="flex flex-col sm:items-end gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <LicenseBadge license={track.license} />

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>Provided by</span>
          <a
            href={track.jamendoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded px-1 py-0.5"
            title={`View "${track.title}" on Jamendo (opens in new tab)`}
          >
            <span>Jamendo</span>
            <span className="text-[9px] opacity-70" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
