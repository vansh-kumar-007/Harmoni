"use client";

import React, { useState } from "react";
import type { NormalizedArtist } from "@/lib/music/types";

interface ArtistCardProps {
  artist: NormalizedArtist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-surface-hover transition-all shadow-2xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Artist Avatar */}
        <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border border-border/80 bg-surface flex items-center justify-center">
          {artist.imageUrl && !imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={artist.imageUrl}
              alt={`Profile photo of ${artist.name}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <span className="text-primary font-bold text-base select-none" aria-hidden="true">
              👤
            </span>
          )}
        </div>

        {/* Text Metadata */}
        <div className="min-w-0 space-y-1">
          <h3
            className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            title={artist.name}
          >
            {artist.name}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {artist.joinDate && (
              <span>{`Joined ${artist.joinDate.slice(0, 4)}`}</span>
            )}
            {artist.website && (
              <>
                {artist.joinDate && <span aria-hidden="true">•</span>}
                <a
                  href={artist.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors truncate max-w-[150px]"
                  title={`Visit ${artist.name}'s website`}
                >
                  Website ↗
                </a>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Jamendo Provider Link */}
      <div className="shrink-0 flex items-center">
        <a
          href={artist.jamendoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`View "${artist.name}" on Jamendo (opens in new tab)`}
        >
          <span>Jamendo Profile</span>
          <span className="text-[10px] opacity-70" aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
