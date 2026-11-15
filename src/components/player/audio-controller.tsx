"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore, AudioControllerHandle } from "@/lib/player/store";

/**
 * Global persistent HTMLAudioElement controller.
 * Mounted once at the RootLayout level to maintain continuous playback
 * across client-side route transitions without interruption.
 */
export function AudioController() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const registerAudioHandle = usePlayerStore((s) => s.registerAudioHandle);
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setPlaybackState = usePlayerStore((s) => s.setPlaybackState);
  const handleTrackEnded = usePlayerStore((s) => s.handleTrackEnded);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Initialize audio volume and muted state from current store
    const initialVolume = usePlayerStore.getState().volume;
    const initialMuted = usePlayerStore.getState().isMuted;
    audio.volume = initialVolume;
    audio.muted = initialMuted;

    const handle: AudioControllerHandle = {
      loadAndPlay: async (streamUrl: string) => {
        try {
          audio.src = streamUrl;
          audio.load();
          await audio.play();
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") {
            // Normal abort when rapid track switching occurs; do not treat as fatal
            return;
          }
          if (err instanceof Error && err.name === "NotAllowedError") {
            setPlaybackState("paused");
            return;
          }
          usePlayerStore.setState({
            playbackState: "error",
            errorMessage: "Unable to start audio playback. Click Retry or select another track.",
          });
        }
      },
      play: async () => {
        try {
          await audio.play();
        } catch (err: unknown) {
          if (err instanceof Error && err.name === "AbortError") return;
          if (err instanceof Error && err.name === "NotAllowedError") {
            setPlaybackState("paused");
            return;
          }
          usePlayerStore.setState({
            playbackState: "error",
            errorMessage: "Playback could not resume. Click Retry to reload.",
          });
        }
      },
      pause: () => {
        audio.pause();
      },
      seek: (time: number) => {
        if (Number.isFinite(time)) {
          audio.currentTime = time;
        }
      },
      setVolume: (volume: number) => {
        audio.volume = Math.max(0, Math.min(1, volume));
      },
      setMuted: (muted: boolean) => {
        audio.muted = muted;
      },
    };

    registerAudioHandle(handle);

    return () => {
      registerAudioHandle(null);
    };
  }, [registerAudioHandle, setPlaybackState]);

  return (
    <audio
      ref={audioRef}
      preload="metadata"
      className="hidden"
      aria-hidden="true"
      onTimeUpdate={() => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.currentTime)) {
          setCurrentTime(audio.currentTime);
        }
      }}
      onDurationChange={() => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      }}
      onLoadedMetadata={() => {
        const audio = audioRef.current;
        if (audio && Number.isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
      }}
      onPlaying={() => {
        setPlaybackState("playing");
      }}
      onPause={() => {
        const currentState = usePlayerStore.getState().playbackState;
        if (currentState === "playing") {
          setPlaybackState("paused");
        }
      }}
      onEnded={() => {
        handleTrackEnded();
      }}
      onError={() => {
        const audio = audioRef.current;
        // Only report error if audio had a source set
        if (audio && audio.src) {
          usePlayerStore.setState({
            playbackState: "error",
            errorMessage: "Audio playback encountered a decoding or network error. Please try again.",
          });
        }
      }}
    />
  );
}
