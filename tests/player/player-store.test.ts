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

  const sampleVerifiedTrack3: NormalizedTrack = {
    id: "103",
    provider: "JAMENDO",
    title: "Track Three",
    artistId: "3",
    artistName: "Artist Three",
    albumId: "30",
    albumTitle: "Album Three",
    durationSeconds: 210,
    durationFormatted: "3:30",
    coverUrl: null,
    jamendoUrl: "https://www.jamendo.com/track/103",
    license: {
      code: "CC BY-NC 4.0",
      name: "Creative Commons Attribution-NonCommercial 4.0",
      url: "https://creativecommons.org/licenses/by-nc/4.0/",
      isCreativeCommons: true,
      isVerified: true,
      nonCommercial: true,
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
      loadAndPlay: vi.fn().mockImplementation(async () => {
        usePlayerStore.getState().setPlaybackState("playing");
      }),
      play: vi.fn().mockImplementation(async () => {
        usePlayerStore.getState().setPlaybackState("playing");
      }),
      pause: vi.fn().mockImplementation(() => {
        usePlayerStore.getState().setPlaybackState("paused");
      }),
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

    it("keeps state as loading until the audio controller confirms playback", async () => {
      let resolveFetch: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      global.fetch = vi.fn().mockImplementation(() => fetchPromise);

      // Custom mock handle that does NOT immediately set playing
      const pendingHandle: AudioControllerHandle = {
        loadAndPlay: vi.fn().mockReturnValue(new Promise(() => {})), // keeps pending
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        setVolume: vi.fn(),
        setMuted: vi.fn(),
      };
      usePlayerStore.setState({ audioHandle: pendingHandle });

      void usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      // While fetch is in progress, state must be loading
      expect(usePlayerStore.getState().playbackState).toBe("loading");

      // Resolve fetch response
      resolveFetch!({
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

      // Allow microtasks to run
      await Promise.resolve();
      await Promise.resolve();

      // State remains loading until native audio element fires playing
      expect(usePlayerStore.getState().playbackState).toBe("loading");
      expect(usePlayerStore.getState().streamUrl).toBe(
        "https://prod-1.storage.jamendo.com/?trackid=101&format=mp32"
      );

      // Native audio fires onPlaying
      usePlayerStore.getState().setPlaybackState("playing");
      expect(usePlayerStore.getState().playbackState).toBe("playing");
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

    it("transitions to error and never becomes playing when stream resolves but audioHandle is null", async () => {
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

      // Explicitly unregister audioHandle
      usePlayerStore.setState({ audioHandle: null });

      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      const state = usePlayerStore.getState();
      expect(state.playbackState).toBe("error");
      expect(state.playbackState).not.toBe("playing");
      expect(state.errorMessage).toBe("Audio player is not ready. Please retry.");
      expect(state.streamUrl).toBeNull();
      expect(state.currentTrack?.id).toBe("101");

      // Verify retry functions cleanly once audioHandle is registered
      usePlayerStore.getState().registerAudioHandle(mockAudioHandle);
      await usePlayerStore.getState().retry();

      expect(mockAudioHandle.loadAndPlay).toHaveBeenCalledWith(
        "https://prod-1.storage.jamendo.com/?trackid=101&format=mp32"
      );
      expect(usePlayerStore.getState().playbackState).toBe("playing");
    });

    it("pauses old audio source, sets error state, and preserves queue/history on failed track switch", async () => {
      // 1. Start Track A
      global.fetch = vi.fn().mockResolvedValueOnce({
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
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");
      expect(usePlayerStore.getState().playbackState).toBe("playing");
      expect(mockAudioHandle.loadAndPlay).toHaveBeenCalledTimes(1);

      // Set upcoming queue
      usePlayerStore.setState({ queue: [sampleVerifiedTrack3] });
      vi.mocked(mockAudioHandle.pause).mockClear();

      // 2. User selects Track B, but the stream resolution fails
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          success: false,
          error: "Jamendo server error 500: failed to resolve stream for track 102",
        }),
      });

      await usePlayerStore.getState().playTrack(sampleVerifiedTrack2);

      const state = usePlayerStore.getState();
      // Old audio source must be paused
      expect(mockAudioHandle.pause).toHaveBeenCalledTimes(1);
      // Final state must be error describing the failed Track B request
      expect(state.playbackState).toBe("error");
      expect(state.errorMessage).toBe(
        "Jamendo server error 500: failed to resolve stream for track 102"
      );
      expect(state.currentTrack?.id).toBe("102");
      expect(state.streamUrl).toBeNull();
      // Queue and history must remain consistent
      expect(state.history).toHaveLength(1);
      expect(state.history[0].id).toBe("101");
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].id).toBe("103");
    });

    it("ensures an obsolete failed request cannot pause a newer track that has already started", async () => {
      // 1. Track A is playing
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { streamUrl: "https://prod-1.storage.jamendo.com/?trackid=101" },
        }),
      });
      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);
      expect(usePlayerStore.getState().playbackState).toBe("playing");
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");

      // 2. Track B fetch starts but hangs
      let rejectTrackB: (err: unknown) => void;
      const trackBPromise = new Promise((_, reject) => {
        rejectTrackB = reject;
      });

      let resolveTrackC: (value: unknown) => void;
      const trackCPromise = new Promise((resolve) => {
        resolveTrackC = resolve;
      });

      global.fetch = vi.fn()
        .mockImplementationOnce(() => trackBPromise)
        .mockImplementationOnce(() => trackCPromise);

      // User selects Track B (resolutionId 2)
      const playB = usePlayerStore.getState().playTrack(sampleVerifiedTrack2);

      // User quickly selects Track C (resolutionId 3)
      const playC = usePlayerStore.getState().playTrack(sampleVerifiedTrack3);

      // Track C resolves successfully and starts playing
      resolveTrackC!({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { streamUrl: "https://prod-1.storage.jamendo.com/?trackid=103" },
        }),
      });
      await playC;

      expect(usePlayerStore.getState().currentTrack?.id).toBe("103");
      expect(usePlayerStore.getState().playbackState).toBe("playing");
      vi.mocked(mockAudioHandle.pause).mockClear();

      // Now Track B's obsolete request rejects with a network error
      rejectTrackB!(new Error("Network timeout on track 102"));
      await playB;

      // Obsolete failure must NOT pause the newer track or corrupt its state
      expect(mockAudioHandle.pause).not.toHaveBeenCalled();
      expect(usePlayerStore.getState().playbackState).toBe("playing");
      expect(usePlayerStore.getState().currentTrack?.id).toBe("103");
      expect(usePlayerStore.getState().errorMessage).toBeNull();
    });

    it("ensures native pause/waiting/playing events do not overwrite the final error state", () => {
      usePlayerStore.setState({
        playbackState: "error",
        errorMessage: "Failed to resolve stream",
      });

      // Simulate native audio controller emitting pause/waiting/playing events
      usePlayerStore.getState().setPlaybackState("paused");
      expect(usePlayerStore.getState().playbackState).toBe("error");

      usePlayerStore.getState().setPlaybackState("loading");
      expect(usePlayerStore.getState().playbackState).toBe("error");

      usePlayerStore.getState().setPlaybackState("playing");
      expect(usePlayerStore.getState().playbackState).toBe("error");
    });
  });

  describe("Playback History & Queue Behaviour (Scenarios 1-6)", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        const parsedUrl = new URL(url, "http://localhost:3000");
        const trackId = parsedUrl.searchParams.get("trackId");
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: {
              streamUrl: `https://prod-1.storage.jamendo.com/?trackid=${trackId}&format=mp32`,
              format: "mp3",
              bitrate: 128,
            },
          }),
        });
      });
    });

    it("Scenario 1 & 2: Start Track A, directly select Track B from search, then press Previous to restore Track A", async () => {
      // 1. Start Track A
      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");
      expect(usePlayerStore.getState().history).toEqual([]);

      // Directly select Track B from search
      await usePlayerStore.getState().playTrack(sampleVerifiedTrack2);
      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      // Track A must be recorded into history
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);

      // 2. Press Previous: Track A must be restored, Track B moves to queue
      await usePlayerStore.getState().previousTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");
      expect(usePlayerStore.getState().history).toEqual([]);
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack2]);
    });

    it("Scenario 3 & 4: Start Track A, queue B and C, then use Play Now on C; verify remaining queue and history", async () => {
      // Start Track A
      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);

      // Queue Tracks B and C
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack2);
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack3);

      expect(usePlayerStore.getState().queue).toEqual([
        sampleVerifiedTrack2,
        sampleVerifiedTrack3,
      ]);

      // Use Play Now on Track C (index 1 in queue)
      await usePlayerStore.getState().playFromQueue(1);

      // Track C is now playing
      expect(usePlayerStore.getState().currentTrack?.id).toBe("103");
      // Track A moved to history
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);
      // Remaining queue contains Track B
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack2]);

      // Next advances to Track B
      await usePlayerStore.getState().nextTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      // Track C was added to history
      expect(usePlayerStore.getState().history).toEqual([
        sampleVerifiedTrack1,
        sampleVerifiedTrack3,
      ]);
      expect(usePlayerStore.getState().queue).toEqual([]);
    });

    it("Scenario 5: Use Next repeatedly across queue and verify current track is added to history exactly once", async () => {
      // Start Track A, queue B and C
      await usePlayerStore.getState().playTrack(sampleVerifiedTrack1);
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack2);
      usePlayerStore.getState().addToQueue(sampleVerifiedTrack3);

      expect(usePlayerStore.getState().history).toEqual([]);

      // 1. Next: advances to Track B
      await usePlayerStore.getState().nextTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);

      // 2. Next: advances to Track C
      await usePlayerStore.getState().nextTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("103");
      expect(usePlayerStore.getState().history).toEqual([
        sampleVerifiedTrack1,
        sampleVerifiedTrack2,
      ]);

      // 3. Next: queue exhausted -> pauses, resets time, history unchanged
      await usePlayerStore.getState().nextTrack();
      expect(usePlayerStore.getState().playbackState).toBe("paused");
      expect(usePlayerStore.getState().currentTime).toBe(0);
      expect(usePlayerStore.getState().currentTrack?.id).toBe("103");
      // Current track was not duplicated into history upon queue exhaustion
      expect(usePlayerStore.getState().history).toEqual([
        sampleVerifiedTrack1,
        sampleVerifiedTrack2,
      ]);
    });

    it("Scenario 6: Use Previous repeatedly and ensure history and queue do not accumulate duplicate entries", async () => {
      // Setup state: History has [Track 1, Track 2], Current is Track 3, Queue is []
      usePlayerStore.setState({
        history: [sampleVerifiedTrack1, sampleVerifiedTrack2],
        currentTrack: sampleVerifiedTrack3,
        queue: [],
        currentTime: 0,
      });

      // 1. Previous: plays Track 2, puts Track 3 in queue
      await usePlayerStore.getState().previousTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("102");
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack3]);

      // 2. Previous: plays Track 1, puts Track 2 at front of queue
      await usePlayerStore.getState().previousTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");
      expect(usePlayerStore.getState().history).toEqual([]);
      expect(usePlayerStore.getState().queue).toEqual([
        sampleVerifiedTrack2,
        sampleVerifiedTrack3,
      ]);

      // 3. Previous when history is empty: seeks to 0, does NOT modify queue or history
      await usePlayerStore.getState().previousTrack();
      expect(usePlayerStore.getState().currentTrack?.id).toBe("101");
      expect(usePlayerStore.getState().history).toEqual([]);
      expect(usePlayerStore.getState().queue).toEqual([
        sampleVerifiedTrack2,
        sampleVerifiedTrack3,
      ]);

      // 4. Repeated Previous when history is empty continues seeking to 0 safely
      await usePlayerStore.getState().previousTrack();
      expect(usePlayerStore.getState().history).toEqual([]);
      expect(usePlayerStore.getState().queue).toHaveLength(2);
    });

    it("previousTrack restarts track if played for more than 3 seconds without altering queue or history", async () => {
      usePlayerStore.setState({
        currentTrack: sampleVerifiedTrack2,
        currentTime: 10,
        history: [sampleVerifiedTrack1],
        queue: [sampleVerifiedTrack3],
      });

      await usePlayerStore.getState().previousTrack();

      expect(mockAudioHandle.seek).toHaveBeenCalledWith(0);
      expect(usePlayerStore.getState().currentTime).toBe(0);
      // History and queue must remain unchanged
      expect(usePlayerStore.getState().history).toEqual([sampleVerifiedTrack1]);
      expect(usePlayerStore.getState().queue).toEqual([sampleVerifiedTrack3]);
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
