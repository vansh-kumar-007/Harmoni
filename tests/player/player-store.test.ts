import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { usePlayerStore, AudioControllerHandle } from "@/lib/player/store";
import type { NormalizedTrack } from "@/lib/music/types";

describe("Player Store (Zustand In-Memory Store)", () => {
  const originalFetch = global.fetch;

  const sampleVerifiedTrack1: NormalizedTrack = {
    id: "101",
    provider: "JAMENDO",
    title: "Track One",
    artistId: "1",
    artistName: "Artist One",
    albumId: "10",
    albumTitle: "Album One",
    durationSeconds: 180,
    durationFormatted: "3:00",
    coverUrl: "https://usercontent.jamendo.com/cover1.jpg",
    jamendoUrl: "https://www.jamendo.com/track/101",
    license: {
      code: "CC BY-SA 4.0",
      name: "Creative Commons Attribution-ShareAlike 4.0",
      url: "https://creativecommons.org/licenses/by-sa/4.0/",
      isCreativeCommons: true,
      isVerified: true,
      nonCommercial: false,
      shareAlike: true,
      noDerivatives: false,
    },
  };

  const sampleVerifiedTrack2: NormalizedTrack = {
    id: "102",
    provider: "JAMENDO",
    title: "Track Two",
    artistId: "2",
    artistName: "Artist Two",
    albumId: null,
    albumTitle: null,
    durationSeconds: 240,
    durationFormatted: "4:00",
    coverUrl: null,
    jamendoUrl: "https://www.jamendo.com/track/102",
    license: {
      code: "CC BY 4.0",
      name: "Creative Commons Attribution 4.0",
      url: "https://creativecommons.org/licenses/by/4.0/",
      isCreativeCommons: true,
      isVerified: true,
      nonCommercial: false,
      shareAlike: false,
      noDerivatives: false,
    },
  };

  const sampleUnverifiedTrack: NormalizedTrack = {
    id: "999",
    provider: "JAMENDO",
    title: "Unverified Track",
    artistId: "9",
    artistName: "Unknown Artist",
    albumId: null,
    albumTitle: null,
    durationSeconds: 120,
    durationFormatted: "2:00",
    coverUrl: null,
    jamendoUrl: "https://www.jamendo.com/track/999",
    license: {
      code: "Unknown License",
      name: "Unknown or Unrecognized License",
      url: null,
      isCreativeCommons: false,
      isVerified: false,
      nonCommercial: false,
      shareAlike: false,
      noDerivatives: false,
    },
  };

  let mockAudioHandle: AudioControllerHandle;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioHandle = {
      loadAndPlay: vi.fn().mockResolvedValue(undefined),
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      seek: vi.fn(),
      setVolume: vi.fn(),
      setMuted: vi.fn(),
    };

    // Reset store state to initial
    usePlayerStore.setState({
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
      audioHandle: mockAudioHandle,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Initial State", () => {
    it("initializes with empty, in-memory defaults", () => {
      const state = usePlayerStore.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.streamUrl).toBeNull();
      expect(state.playbackState).toBe("idle");
      expect(state.errorMessage).toBeNull();
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
      expect(state.volume).toBe(1);
      expect(state.isMuted).toBe(false);
      expect(state.queue).toEqual([]);
      expect(state.history).toEqual([]);
      expect(state.isQueueOpen).toBe(false);
    });
  });

  describe("playTrack and License Enforcement", () => {
    it("refuses playback and sets error state if track has unverified license", async () => {
      global.fetch = vi.fn();

      await usePlayerStore.getState().playTrack(sampleUnverifiedTrack);

      const state = usePlayerStore.getState();
      expect(state.playbackState).toBe("error");
      expect(state.errorMessage).toContain("unverified or unrecognized license");
      expect(state.streamUrl).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockAudioHandle.loadAndPlay).not.toHaveBeenCalled();
    });

    it("successfully fetches stream URL and starts playback for verified track", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            streamUrl: "https://prod-1.storage.jamendo.com/?trackid=101&format=mp32",
            format: "mp3",
            bitrate: 128,
          },
        }),
      });

      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      const state = usePlayerStore.getState();
      expect(state.playbackState).toBe("playing");
      expect(state.currentTrack?.id).toBe("101");
      expect(state.streamUrl).toBe("https://prod-1.storage.jamendo.com/?trackid=101&format=mp32");
      expect(state.errorMessage).toBeNull();
      expect(mockAudioHandle.loadAndPlay).toHaveBeenCalledWith(
        "https://prod-1.storage.jamendo.com/?trackid=101&format=mp32"
      );
    });

    it("handles stream resolution failure cleanly", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({
          success: false,
          error: "No audio stream available",
        }),
      });

      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      const state = usePlayerStore.getState();
      expect(state.playbackState).toBe("error");
      expect(state.errorMessage).toBe("No audio stream available");
      expect(state.streamUrl).toBeNull();
    });

    it("prevents race conditions by discarding stale out-of-order stream resolutions", async () => {
      let resolveFirstTrack: (value: unknown) => void;
      const firstPromise = new Promise((resolve) => {
        resolveFirstTrack = resolve;
      });

      let resolveSecondTrack: (value: unknown) => void;
      const secondPromise = new Promise((resolve) => {
        resolveSecondTrack = resolve;
      });

      global.fetch = vi.fn()
        .mockImplementationOnce(() => firstPromise)
        .mockImplementationOnce(() => secondPromise);

      // 1. User starts track 1
      const play1 = usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      // 2. User quickly skips to track 2
      const play2 = usePlayerStore.getState().playTrack(sampleVerifiedTrack2);

      // 3. Track 2 resolves first
      resolveSecondTrack!({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { streamUrl: "https://prod-1.storage.jamendo.com/?trackid=102" },
        }),
      });
      await play2;

      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      expect(usePlayerStore.getState().streamUrl).toBe("https://prod-1.storage.jamendo.com/?trackid=102");

      // 4. Stale track 1 finally resolves
      resolveFirstTrack!({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { streamUrl: "https://prod-1.storage.jamendo.com/?trackid=101" },
        }),
      });
      await play1;

      // 5. Verify track 1's stale response did NOT overwrite track 2
      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      expect(usePlayerStore.getState().streamUrl).toBe("https://prod-1.storage.jamendo.com/?trackid=102");
    });
  });

  describe("Queue Operations", () => {
    it("addToQueue plays immediately if no track is currently playing", () => {
      const playTrackSpy = vi.spyOn(usePlayerStore.getState(), "playTrack");
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack1);

      expect(playTrackSpy).toHaveBeenCalledWith(sampleVerifiedTrack1);
    });

    it("addToQueue appends to queue if a track is already active", () => {
      usePlayerStore.setState({ currentTrack: sampleVerifiedTrack1 });
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack2);

      expect(usePlayerStore.getState().queue).toHaveLength(1);
      expect(usePlayerStore.getState().queue[0].id).toBe("102");
    });

    it("playNextInQueue places track at the front of queue", () => {
      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack1,
        queue: [sampleVerifiedTrack1],
      });

      usePlayerStore.getState().playNextInQueue(sampleVerifiedTrack2);

      const queue = usePlayerStore.getState().queue;
      expect(queue).toHaveLength(2);
      expect(queue[0].id).toBe("102");
      expect(queue[1].id).toBe("101");
    });

    it("removeFromQueue removes item by index", () => {
      usePlayerStore.setState({
        queue: [sampleVerifiedTrack1, sampleVerifiedTrack2],
      });

      usePlayerStore.getState().removeFromQueue(0);

      const queue = usePlayerStore.getState().queue;
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe("102");
    });

    it("clearQueue empties upcoming queue", () => {
      usePlayerStore.setState({
        queue: [sampleVerifiedTrack1, sampleVerifiedTrack2],
      });

      usePlayerStore.getState().clearQueue();
      expect(usePlayerStore.getState().queue).toEqual([]);
    });

    it("playQueue sets upcoming queue and plays selected track", async () => {
      const playTrackSpy = vi.spyOn(usePlayerStore.getState(), "playTrack").mockResolvedValue();

      await usePlayerStore.getState().playQueue([sampleVerifiedTrack1, sampleVerifiedTrack2], 0);

      expect(playTrackSpy).toHaveBeenCalledWith(sampleVerifiedTrack1);
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack2]);
    });
  });

  describe("Navigation (nextTrack / previousTrack)", () => {
    it("nextTrack advances to next item and archives current track into history", async () => {
      const playTrackSpy = vi.spyOn(usePlayerStore.getState(), "playTrack").mockResolvedValue();

      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack1,
        queue: [sampleVerifiedTrack2],
        history: [],
      });

      await usePlayerStore.getState().nextTrack();

      expect(playTrackSpy).toHaveBeenCalledWith(sampleVerifiedTrack2);
      expect(usePlayerStore.getState().queue).toEqual([]);
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);
    });

    it("nextTrack pauses and resets when queue is empty", async () => {
      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack1,
        queue: [],
        playbackState: "playing",
      });

      await usePlayerStore.getState().nextTrack();

      expect(mockAudioHandle.pause).toHaveBeenCalled();
      expect(usePlayerStore.getState().playbackState).toBe("paused");
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });

    it("previousTrack restarts track if played for more than 3 seconds", async () => {
      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack1,
        currentTime: 10,
        history: [sampleVerifiedTrack2],
      });

      await usePlayerStore.getState().previousTrack();

      expect(mockAudioHandle.seek).toHaveBeenCalledWith(0);
      expect(usePlayerStore.getState().currentTime).toBe(0);
      // History should NOT have been popped
      expect(usePlayerStore.getState().history).toHaveLength(1);
    });

    it("previousTrack plays previous track from history if played for <= 3 seconds", async () => {
      const playTrackSpy = vi.spyOn(usePlayerStore.getState(), "playTrack").mockResolvedValue();

      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack2,
        currentTime: 2,
        history: [sampleVerifiedTrack1],
        queue: [],
      });

      await usePlayerStore.getState().previousTrack();

      expect(playTrackSpy).toHaveBeenCalledWith(sampleVerifiedTrack1);
      expect(usePlayerStore.getState().history).toEqual([]);
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack2]);
    });
  });

  describe("Volume, Mute, and Seeking", () => {
    it("setVolume clamps value between 0 and 1 and syncs to audioHandle", () => {
      usePlayerStore.getState().setVolume(0.75);
      expect(usePlayerStore.getState().volume).toBe(0.75);
      expect(mockAudioHandle.setVolume).toHaveBeenCalledWith(0.75);

      usePlayerStore.getState().setVolume(1.5);
      expect(usePlayerStore.getState().volume).toBe(1);

      usePlayerStore.getState().setVolume(-0.2);
      expect(usePlayerStore.getState().volume).toBe(0);
    });

    it("setVolume un-mutes automatically if muted and volume is raised", () => {
      usePlayerStore.setState({ isMuted: true, volume: 0 });

      usePlayerStore.getState().setVolume(0.5);

      expect(usePlayerStore.getState().isMuted).toBe(false);
      expect(mockAudioHandle.setMuted).toHaveBeenCalledWith(false);
    });

    it("toggleMute toggles isMuted and updates audioHandle", () => {
      expect(usePlayerStore.getState().isMuted).toBe(false);

      usePlayerStore.getState().toggleMute();
      expect(usePlayerStore.getState().isMuted).toBe(true);
      expect(mockAudioHandle.setMuted).toHaveBeenCalledWith(true);

      usePlayerStore.getState().toggleMute();
      expect(usePlayerStore.getState().isMuted).toBe(false);
      expect(mockAudioHandle.setMuted).toHaveBeenCalledWith(false);
    });

    it("seek clamps position and calls audioHandle", () => {
      usePlayerStore.setState({ duration: 180 });

      usePlayerStore.getState().seek(45);
      expect(usePlayerStore.getState().currentTime).toBe(45);
      expect(mockAudioHandle.seek).toHaveBeenCalledWith(45);

      usePlayerStore.getState().seek(250);
      expect(usePlayerStore.getState().currentTime).toBe(180);

      usePlayerStore.getState().seek(-10);
      expect(usePlayerStore.getState().currentTime).toBe(0);
    });
  });

  describe("Drawer State", () => {
    it("toggles and sets queue drawer visibility", () => {
      expect(usePlayerStore.getState().isQueueOpen).toBe(false);

      usePlayerStore.getState().setQueueOpen(true);
      expect(usePlayerStore.getState().isQueueOpen).toBe(true);

      usePlayerStore.getState().toggleQueueOpen();
      expect(usePlayerStore.getState().isQueueOpen).toBe(false);
    });
  });
});
