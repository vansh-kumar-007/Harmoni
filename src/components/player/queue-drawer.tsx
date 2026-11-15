"use client";

import React, { useEffect, useRef } from "react";
import { X, Play, Trash2, ListMusic, Music2 } from "lucide-react";
import { usePlayerStore } from "@/lib/player/store";
import { LicenseBadge } from "@/components/music/license-badge";

export function QueueDrawer() {
  const isQueueOpen = usePlayerStore((s) => s.isQueueOpen);
  const setQueueOpen = usePlayerStore((s) => s.setQueueOpen);
  const queue = usePlayerStore((s) => s.queue);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const playbackState = usePlayerStore((s) => s.playbackState);
  const playFromQueue = usePlayerStore((s) => s.playFromQueue);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);

  const drawerRef = useRef<HTMLDivElement | null>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isQueueOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setQueueOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isQueueOpen, setQueueOpen]);

  if (!isQueueOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={() => setQueueOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Playback Queue"
    >
      <div
        ref={drawerRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-player-bg border-l border-border flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Playback Queue</h2>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-surface border border-border text-muted-foreground">
              {queue.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2.5 py-1 rounded hover:bg-surface"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={() => setQueueOpen(false)}
              aria-label="Close queue"
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Now Playing Section */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Now Playing
            </h3>

            {currentTrack ? (
              <div className="p-3 rounded-lg border border-primary/30 bg-primary-subtle/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-surface border border-border shrink-0 flex items-center justify-center">
                    {currentTrack.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={currentTrack.coverUrl}
                        alt={`Cover artwork for ${currentTrack.title}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="w-5 h-5 text-primary" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-foreground truncate" title={currentTrack.title}>
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate" title={currentTrack.artistName}>
                      {currentTrack.artistName}
                    </p>
                    <div className="pt-0.5">
                      <LicenseBadge license={currentTrack.license} />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground">
                    {currentTrack.durationFormatted}
                  </span>
                  {playbackState === "playing" && (
                    <span className="inline-flex items-center gap-0.5 h-3 text-primary" aria-label="Playing animation">
                      <span className="w-0.5 h-3 bg-primary animate-pulse" />
                      <span className="w-0.5 h-2 bg-primary animate-pulse delay-75" />
                      <span className="w-0.5 h-3.5 bg-primary animate-pulse delay-150" />
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-border text-center text-xs text-muted-foreground">
                No track currently playing
              </div>
            )}
          </div>

          {/* Up Next Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {`Up Next (${queue.length})`}
              </h3>
            </div>

            {queue.length === 0 ? (
              <div className="p-6 rounded-lg border border-dashed border-border/80 text-center space-y-2">
                <ListMusic className="w-8 h-8 text-muted-foreground/60 mx-auto" />
                <p className="text-sm font-medium text-foreground">Your queue is empty</p>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Search for music on the discovery page and click &quot;Add to Queue&quot; to queue up songs for continuous playback.
                </p>
              </div>
            ) : (
              <ul className="space-y-2" aria-label="Upcoming tracks">
                {queue.map((track, idx) => (
                  <li
                    key={`${track.id}-${idx}`}
                    className="p-2.5 rounded-lg border border-border/80 bg-surface hover:bg-surface-hover transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono text-xs text-muted-foreground w-4 text-center">
                        {idx + 1}
                      </span>

                      <div className="w-10 h-10 rounded overflow-hidden bg-card border border-border shrink-0 flex items-center justify-center">
                        {track.coverUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={track.coverUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music2 className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-foreground truncate" title={track.title}>
                          {track.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate" title={track.artistName}>
                          {track.artistName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {track.durationFormatted}
                      </span>

                      <button
                        type="button"
                        onClick={() => playFromQueue(idx)}
                        aria-label={`Play ${track.title} now`}
                        title="Play now"
                        className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-card transition-colors opacity-80 group-hover:opacity-100"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => removeFromQueue(idx)}
                        aria-label={`Remove ${track.title} from queue`}
                        title="Remove from queue"
                        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-card transition-colors opacity-80 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
