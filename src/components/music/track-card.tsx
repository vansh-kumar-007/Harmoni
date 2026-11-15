"use client";

import React, { useState } from "react";
import type { NormalizedTrack } from "@/lib/music/types";
import { LicenseBadge } from "./license-badge";

interface TrackCardProps {
  track: NormalizedTrack;
}

export function TrackCard({ track }: TrackCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-surface-hover transition-all shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Artwork + Title/Artist/Album Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Cover Artwork */}
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
