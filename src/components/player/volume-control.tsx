"use client";

import React from "react";
import { Volume2, Volume1, VolumeX } from "lucide-react";
import { usePlayerStore } from "@/lib/player/store";

export function VolumeControl() {
  const volume = usePlayerStore((s) => s.volume);
  const isMuted = usePlayerStore((s) => s.isMuted);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleMute = usePlayerStore((s) => s.toggleMute);

  const effectiveVolume = isMuted ? 0 : volume;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setVolume(Math.max(0, volume - 0.05));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setVolume(Math.min(1, volume + 0.05));
    }
  };

  return (
    <div className="flex items-center gap-2 group">
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        title={isMuted ? "Unmute" : "Mute"}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
      >
        {isMuted || effectiveVolume === 0 ? (
          <VolumeX className="w-4 h-4 text-destructive" />
        ) : effectiveVolume < 0.5 ? (
          <Volume1 className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>

      <div className="relative w-20 flex items-center">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={effectiveVolume}
          onChange={(e) => setVolume(Number(e.target.value))}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Volume slider"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(effectiveVolume * 100)}
          aria-valuetext={`${Math.round(effectiveVolume * 100)}%`}
          className="w-full h-1.5 appearance-none bg-surface border border-border/80 rounded-full cursor-pointer accent-primary group-hover:h-2 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        />
      </div>
    </div>
  );
}
