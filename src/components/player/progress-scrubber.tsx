"use client";

import React, { useState } from "react";
import { formatDuration } from "@/lib/music/licenses";
import { usePlayerStore } from "@/lib/player/store";

interface ProgressScrubberProps {
  disabled?: boolean;
}

export function ProgressScrubber({ disabled = false }: ProgressScrubberProps) {
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const seek = usePlayerStore((s) => s.seek);

  const [isDragging, setIsDragging] = useState(false);
  const [dragTime, setDragTime] = useState(0);

  const displayTime = isDragging ? dragTime : currentTime;
  const safeDuration = duration > 0 ? duration : 0;

  const handleSeek = (newTime: number) => {
    const clamped = Math.max(0, Math.min(safeDuration, newTime));
    seek(clamped);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || safeDuration <= 0) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      handleSeek(currentTime - 5);
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      handleSeek(currentTime + 5);
    } else if (e.key === "Home") {
      e.preventDefault();
      handleSeek(0);
    } else if (e.key === "End") {
      e.preventDefault();
      handleSeek(safeDuration);
    }
  };

  return (
    <div className="w-full flex items-center gap-2.5 text-xs select-none">
      <span className="w-10 text-right font-mono text-muted-foreground tabular-nums text-[11px] shrink-0">
        {formatDuration(displayTime)}
      </span>

      <div className="relative flex-1 flex items-center group">
        <input
          type="range"
          min={0}
          max={safeDuration || 100}
          step={0.5}
          disabled={disabled || safeDuration <= 0}
          value={displayTime}
          onChange={(e) => {
            const val = Number(e.target.value);
            setDragTime(val);
            if (!isDragging) {
              handleSeek(val);
            }
          }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={(e) => {
            setIsDragging(false);
            handleSeek(Number((e.target as HTMLInputElement).value));
          }}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={(e) => {
            setIsDragging(false);
            handleSeek(Number((e.target as HTMLInputElement).value));
          }}
          onKeyDown={handleKeyDown}
          role="slider"
          aria-label="Playback seek slider"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={Math.round(displayTime)}
          aria-valuetext={`${formatDuration(displayTime)} of ${formatDuration(safeDuration)}`}
          aria-disabled={disabled || safeDuration <= 0}
          className={`w-full h-1.5 appearance-none bg-surface border border-border/80 rounded-full cursor-pointer accent-primary group-hover:h-2 transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-primary ${
            disabled ? "opacity-50 cursor-not-allowed" : ""
          }`}
        />
      </div>

      <span className="w-10 text-left font-mono text-muted-foreground tabular-nums text-[11px] shrink-0">
        {formatDuration(safeDuration)}
      </span>
    </div>
  );
}
