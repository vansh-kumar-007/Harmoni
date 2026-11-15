import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";
import type { NormalizedTrack } from "@/lib/music/types";

export type PlaybackState = "idle" | "loading" | "playing" | "paused" | "error";

export interface AudioControllerHandle {
  loadAndPlay: (streamUrl: string) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
}

export interface PlayTrackOptions {
  addToHistory?: boolean;
}

export interface PlayerState {
  // Current playback state
  currentTrack: NormalizedTrack | null;
  streamUrl: string | null;
  playbackState: PlaybackState;
  errorMessage: string | null;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  isMuted: boolean;

  // Queue & navigation state (strictly in-memory, no persistence)
  queue: NormalizedTrack[];
  history: NormalizedTrack[];
  isQueueOpen: boolean;

  // Internal race-condition guard
  resolutionId: number;

  // Audio controller handle
  audioHandle: AudioControllerHandle | null;

  // Actions
  registerAudioHandle: (handle: AudioControllerHandle | null) => void;
  playTrack: (track: NormalizedTrack, options?: PlayTrackOptions) => Promise<void>;
  playFromQueue: (index: number) => Promise<void>;
  playQueue: (tracks: NormalizedTrack[], startIndex?: number) => Promise<void>;
  addToQueue: (track: NormalizedTrack) => void;
  playNextInQueue: (track: NormalizedTrack) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  togglePlayPause: () => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  retry: () => Promise<void>;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setQueueOpen: (isOpen: boolean) => void;
  toggleQueueOpen: () => void;

  // Internal sync actions called by audio controller
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setPlaybackState: (state: PlaybackState) => void;
  handleTrackEnded: () => void;
}

export const playerStore = createStore<PlayerState>((set, get) => ({
  currentTrack: null,
  streamUrl: null,
  playbackState: "idle",
  errorMessage: null,
  currentTime: 0,
  duration: 0,
  volume: 1,
  isMuted: false,
  queue: [],
  history: [],
  isQueueOpen: false,
  resolutionId: 0,
  audioHandle: null,

  registerAudioHandle: (handle) => {
    set({ audioHandle: handle });
  },

  playTrack: async (track: NormalizedTrack, options?: PlayTrackOptions) => {
    // 1. Guard against unverified licenses
    if (!track.license.isVerified) {
      set({
        currentTrack: track,
        streamUrl: null,
        playbackState: "error",
        errorMessage: `Playback unavailable: track "${track.title}" has an unverified or unrecognized license (${track.license.code})`,
      });
      return;
    }

    // 2. Manage chronological playback history
    // If a previous track was active and is being replaced by a different track,
    // record it into history (unless explicitly instructed not to, e.g. during backward navigation).
    const previousTrack = get().currentTrack;
    const shouldAddToHistory =
      options?.addToHistory !== false &&
      previousTrack !== null &&
      previousTrack.id !== track.id;

    const nextHistory = shouldAddToHistory
      ? [...get().history, previousTrack]
      : get().history;

    // 3. Increment resolution ID to guard against out-of-order race conditions
    const currentResolutionId = get().resolutionId + 1;
    set({
      currentTrack: track,
      history: nextHistory,
      playbackState: "loading",
      errorMessage: null,
      currentTime: 0,
      duration: track.durationSeconds || 0,
      resolutionId: currentResolutionId,
    });

    // 4. Resolve ephemeral stream URL via protected API route
    try {
      const response = await fetch(`/api/music/stream-url?trackId=${encodeURIComponent(track.id)}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const payload = await response.json();

      // Check for stale response if another track was requested while resolving
      if (get().resolutionId !== currentResolutionId) {
        return;
      }

      if (!response.ok || !payload.success) {
        const errorMsg =
          payload.error || `Failed to resolve stream (HTTP ${response.status})`;
        set({
          playbackState: "error",
          errorMessage: errorMsg,
          streamUrl: null,
        });
        return;
      }

      const streamUrl = payload.data?.streamUrl;
      if (!streamUrl || typeof streamUrl !== "string") {
        set({
          playbackState: "error",
          errorMessage: "No valid stream URL returned by provider",
          streamUrl: null,
        });
        return;
      }

      // Keep playbackState as "loading" until the native HTMLAudioElement confirms playback
      // via its onPlaying event, preventing prematurely claiming a playing state.
      set({
        streamUrl,
        errorMessage: null,
      });

      // Instruct audio handle to load and play
      const handle = get().audioHandle;
      if (handle) {
        await handle.loadAndPlay(streamUrl);
        // Verify again after async loadAndPlay in case another request intervened
        if (get().resolutionId !== currentResolutionId) {
          return;
        }
      } else {
        // Fallback for headless testing environments without an active AudioController
        set({ playbackState: "playing" });
      }
    } catch (err: unknown) {
      if (get().resolutionId !== currentResolutionId) {
        return;
      }
      set({
        playbackState: "error",
        errorMessage:
          err instanceof Error
            ? err.message
            : "Network error while resolving audio stream",
        streamUrl: null,
      });
    }
  },

  playFromQueue: async (index: number) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const targetTrack = queue[index];
    const nextQueue = queue.filter((_, i) => i !== index);
    set({ queue: nextQueue });
    await get().playTrack(targetTrack);
  },

  playQueue: async (tracks: NormalizedTrack[], startIndex = 0) => {
    if (!tracks || tracks.length === 0) return;
    const safeIndex = Math.max(0, Math.min(startIndex, tracks.length - 1));
    const targetTrack = tracks[safeIndex];
    const upcoming = tracks.slice(safeIndex + 1);

    set({ queue: upcoming });
    await get().playTrack(targetTrack);
  },

  addToQueue: (track: NormalizedTrack) => {
    const { currentTrack, queue } = get();
    if (!currentTrack) {
      get().playTrack(track);
    } else {
      set({ queue: [...queue, track] });
    }
  },

  playNextInQueue: (track: NormalizedTrack) => {
    const { currentTrack, queue } = get();
    if (!currentTrack) {
      get().playTrack(track);
    } else {
      set({ queue: [track, ...queue] });
    }
  },

  removeFromQueue: (index: number) => {
    const { queue } = get();
    if (index < 0 || index >= queue.length) return;
    const nextQueue = [...queue];
    nextQueue.splice(index, 1);
    set({ queue: nextQueue });
  },

  clearQueue: () => {
    set({ queue: [] });
  },

  nextTrack: async () => {
    const { queue } = get();
    if (queue.length > 0) {
      const next = queue[0];
      const remainingQueue = queue.slice(1);

      set({ queue: remainingQueue });
      // playTrack will automatically record currentTrack into history exactly once
      await get().playTrack(next);
    } else {
      const handle = get().audioHandle;
      if (handle) {
        handle.pause();
      }
      set({
        playbackState: "paused",
        currentTime: 0,
      });
    }
  },

  previousTrack: async () => {
    const { currentTime, history, currentTrack, queue, audioHandle } = get();

    // If more than 3 seconds played, restart the current track without modifying history or queue
    if (currentTime > 3) {
      if (audioHandle) {
        audioHandle.seek(0);
      }
      set({ currentTime: 0 });
      return;
    }

    // Otherwise navigate to previous track from history if available
    if (history.length > 0) {
      const prevTrack = history[history.length - 1];
      const nextHistory = history.slice(0, -1);
      // Put the current track back at the front of the upcoming queue
      const nextQueue = currentTrack ? [currentTrack, ...queue] : queue;

      set({
        history: nextHistory,
        queue: nextQueue,
      });
      // Do NOT re-add currentTrack to history since it was just pushed to queue
      await get().playTrack(prevTrack, { addToHistory: false });
    } else {
      // No prior history, simply restart current track
      if (audioHandle) {
        audioHandle.seek(0);
      }
      set({ currentTime: 0 });
    }
  },

  togglePlayPause: async () => {
    const { playbackState, audioHandle, currentTrack, streamUrl } = get();

    if (playbackState === "playing") {
      if (audioHandle) {
        audioHandle.pause();
      }
      set({ playbackState: "paused" });
    } else if (playbackState === "paused") {
      if (audioHandle) {
        set({ playbackState: "loading" });
        await audioHandle.play();
      } else if (currentTrack) {
        await get().playTrack(currentTrack);
      }
    } else if (playbackState === "error" || !streamUrl) {
      if (currentTrack) {
        await get().playTrack(currentTrack);
      }
    }
  },

  pause: () => {
    const { audioHandle } = get();
    if (audioHandle) {
      audioHandle.pause();
    }
    set({ playbackState: "paused" });
  },

  resume: async () => {
    const { audioHandle, currentTrack } = get();
    if (audioHandle) {
      set({ playbackState: "loading" });
      await audioHandle.play();
    } else if (currentTrack) {
      await get().playTrack(currentTrack);
    }
  },

  retry: async () => {
    const { currentTrack } = get();
    if (currentTrack) {
      await get().playTrack(currentTrack);
    }
  },

  seek: (time: number) => {
    const { audioHandle, duration } = get();
    const clampedTime = Math.max(0, Math.min(time, duration || time));
    set({ currentTime: clampedTime });
    if (audioHandle) {
      audioHandle.seek(clampedTime);
    }
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const shouldUnmute = clamped > 0 && get().isMuted;
    set({ volume: clamped, isMuted: shouldUnmute ? false : get().isMuted });
    const { audioHandle } = get();
    if (audioHandle) {
      audioHandle.setVolume(clamped);
      if (shouldUnmute) {
        audioHandle.setMuted(false);
      }
    }
  },

  toggleMute: () => {
    const nextMuted = !get().isMuted;
    set({ isMuted: nextMuted });
    const { audioHandle } = get();
    if (audioHandle) {
      audioHandle.setMuted(nextMuted);
    }
  },

  setQueueOpen: (isOpen: boolean) => {
    set({ isQueueOpen: isOpen });
  },

  toggleQueueOpen: () => {
    set({ isQueueOpen: !get().isQueueOpen });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  setPlaybackState: (state: PlaybackState) => {
    set({ playbackState: state });
  },

  handleTrackEnded: () => {
    get().nextTrack();
  },
}));

/**
 * Universal React hook for the player store.
 * Synchronizes external state across both client render and SSR / testing renderToString.
 */
function usePlayerStoreImpl<T>(selector: (state: PlayerState) => T): T {
  return useSyncExternalStore(
    playerStore.subscribe,
    () => selector(playerStore.getState()),
    () => selector(playerStore.getState())
  );
}

export const usePlayerStore = Object.assign(usePlayerStoreImpl, playerStore);
