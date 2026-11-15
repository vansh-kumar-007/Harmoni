"use client";

import React, { useState } from "react";
import type { NormalizedAlbum } from "@/lib/music/types";

interface AlbumCardProps {
  album: NormalizedAlbum;
}

export function AlbumCard({ album }: AlbumCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <article className="group p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-surface-hover transition-all shadow-2xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Cover Artwork */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-border/80 bg-surface flex items-center justify-center">
          {album.coverUrl && !imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={album.coverUrl}
              alt={`Album cover for ${album.title}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <span className="text-primary font-bold text-lg select-none" aria-hidden="true">
              💿
            </span>
          )}
        </div>

        {/* Text Metadata */}
        <div className="min-w-0 space-y-1">
          <h3
            className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors"
            title={album.title}
          >
            {album.title}
          </h3>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/90 truncate max-w-[200px]" title={album.artistName}>
              {album.artistName}
            </span>
            {album.releaseDate && (
              <>
                <span aria-hidden="true">•</span>
                <span>{album.releaseDate.slice(0, 4)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Jamendo Provider Link */}
      <div className="shrink-0 flex items-center">
        <a
          href={album.jamendoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`View "${album.title}" on Jamendo (opens in new tab)`}
        >
          <span>Jamendo Album</span>
          <span className="text-[10px] opacity-70" aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}
