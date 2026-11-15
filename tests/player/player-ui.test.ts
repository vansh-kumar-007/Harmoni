import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { usePlayerStore } from "@/lib/player/store";
import { PlayerBar } from "@/components/player/player-bar";
import { ProgressScrubber } from "@/components/player/progress-scrubber";
import { VolumeControl } from "@/components/player/volume-control";
import { QueueDrawer } from "@/components/player/queue-drawer";
import { TrackCard } from "@/components/music/track-card";
import type { NormalizedTrack } from "@/lib/music/types";

describe("Audio Player UI Components", () => {
  const verifiedTrack: NormalizedTrack = {
    id: "101",
    provider: "JAMENDO",
    title: "Midnight Symphony",
    artistId: "201",
    artistName: "The Midnight Echo",
    albumId: "301",
    albumTitle: "Nocturne Dreams",
    durationSeconds: 215,
    durationFormatted: "3:35",
    coverUrl: "https://usercontent.jamendo.com/cover101.jpg",
    jamendoUrl: "https://www.jamendo.com/track/101",
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

  const unverifiedTrack: NormalizedTrack = {
    id: "999",
    provider: "JAMENDO",
    title: "Restricted Opus",
    artistId: "888",
    artistName: "Restricted Artist",
    albumId: null,
    albumTitle: null,
    durationSeconds: 150,
    durationFormatted: "2:30",
    coverUrl: null,
    jamendoUrl: "https://www.jamendo.com/track/999",
    license: {
      code: "All Rights Reserved",
      name: "Unrecognized / Non-CC License",
      url: null,
      isCreativeCommons: false,
      isVerified: false,
      nonCommercial: false,
      shareAlike: false,
      noDerivatives: false,
    },
  };

  beforeEach(() => {
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
      audioHandle: null,
    });
  });

  describe("PlayerBar Component", () => {
    it("renders idle docked player with accessible role and labels", () => {
      const html = renderToString(React.createElement(PlayerBar));

      expect(html).toContain('role="region"');
      expect(html).toContain('aria-label="Audio player"');
      expect(html).toContain("No track selected");
      expect(html).toContain("Search music to start playback");
      expect(html).toContain('aria-label="Play audio"');
      expect(html).toContain('aria-label="Volume slider"');
    });

    it("renders active track metadata, license badge, and Jamendo attribution when track is loaded", () => {
      usePlayerStore.setState({
        currentTrack: verifiedTrack,
        playbackState: "playing",
        currentTime: 45,
        duration: 215,
      });

      const html = renderToString(React.createElement(PlayerBar));

      expect(html).toContain("Midnight Symphony");
      expect(html).toContain("The Midnight Echo");
      expect(html).toContain("CC BY-NC 4.0");
      expect(html).toContain('href="https://www.jamendo.com/track/101"');
      expect(html).toContain('aria-label="Pause audio"');
    });

    it("renders error notification alert and retry button on playback failure", () => {
      usePlayerStore.setState({
        currentTrack: verifiedTrack,
        playbackState: "error",
        errorMessage: "Failed to load audio stream from provider",
      });

      const html = renderToString(React.createElement(PlayerBar));

      expect(html).toContain('role="alert"');
      expect(html).toContain("Failed to load audio stream from provider");
      expect(html).toContain("Retry");
    });
  });

  describe("ProgressScrubber Component", () => {
    it("renders seek slider with correct ARIA values and formatted timestamps", () => {
      usePlayerStore.setState({
        currentTime: 75,
        duration: 215,
      });

      const html = renderToString(React.createElement(ProgressScrubber));

      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-label="Playback seek slider"');
      expect(html).toContain('aria-valuemin="0"');
      expect(html).toContain('aria-valuemax="215"');
      expect(html).toContain('aria-valuenow="75"');
      expect(html).toContain("1:15"); // 75 seconds
      expect(html).toContain("3:35"); // 215 seconds
    });

    it("disables scrubber when disabled prop is true", () => {
      const html = renderToString(React.createElement(ProgressScrubber, { disabled: true }));

      expect(html).toContain("disabled");
      expect(html).toContain("cursor-not-allowed");
    });
  });

  describe("VolumeControl Component", () => {
    it("renders volume slider and mute toggle button", () => {
      usePlayerStore.setState({ volume: 0.8, isMuted: false });

      const html = renderToString(React.createElement(VolumeControl));

      expect(html).toContain('role="slider"');
      expect(html).toContain('aria-label="Volume slider"');
      expect(html).toContain('aria-valuenow="80"');
      expect(html).toContain('aria-valuetext="80%"');
      expect(html).toContain('aria-label="Mute audio"');
    });

    it("displays unmute label and 0% value when muted", () => {
      usePlayerStore.setState({ volume: 0.8, isMuted: true });

      const html = renderToString(React.createElement(VolumeControl));

      expect(html).toContain('aria-label="Unmute audio"');
      expect(html).toContain('aria-valuenow="0"');
    });
  });

  describe("QueueDrawer Component", () => {
    it("returns null when queue drawer is closed", () => {
      usePlayerStore.setState({ isQueueOpen: false });

      const html = renderToString(React.createElement(QueueDrawer));
      expect(html).toBe("");
    });

    it("renders drawer with now-playing section and upcoming tracks when open", () => {
      usePlayerStore.setState({
        isQueueOpen: true,
        currentTrack: verifiedTrack,
        queue: [verifiedTrack],
      });

      const html = renderToString(React.createElement(QueueDrawer));

      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-label="Playback Queue"');
      expect(html).toContain("Playback Queue");
      expect(html).toContain("Now Playing");
      expect(html).toContain("Up Next (1)");
      expect(html).toContain("Midnight Symphony");
      expect(html).toContain("Clear all");
    });

    it("renders friendly empty message when queue is empty", () => {
      usePlayerStore.setState({
        isQueueOpen: true,
        currentTrack: null,
        queue: [],
      });

      const html = renderToString(React.createElement(QueueDrawer));

      expect(html).toContain("Your queue is empty");
      expect(html).toContain("No track currently playing");
    });
  });

  describe("TrackCard Component Playback Integration", () => {
    it("renders active Play Now and Add to Queue buttons for verified CC track", () => {
      const html = renderToString(React.createElement(TrackCard, { track: verifiedTrack }));

      expect(html).toContain("Play Now");
      expect(html).toContain("Queue");
      expect(html).not.toContain("Playback unavailable: unverified license");
      expect(html).toContain(`aria-label="Play ${verifiedTrack.title}"`);
    });

    it("disables Play Now and Add to Queue buttons for unverified license track", () => {
      const html = renderToString(React.createElement(TrackCard, { track: unverifiedTrack }));

      expect(html).toContain("Playback unavailable: unverified license");
      expect(html).toContain("cursor-not-allowed");
      expect(html).toContain("disabled");
      // Quick play overlay on artwork should be omitted
      expect(html).not.toContain(`aria-label="Play ${unverifiedTrack.title}"`);
    });

    it("shows Pause button when track is currently playing", () => {
      usePlayerStore.setState({
        currentTrack: verifiedTrack,
        playbackState: "playing",
      });

      const html = renderToString(React.createElement(TrackCard, { track: verifiedTrack }));

      expect(html).toContain("Pause");
      expect(html).toContain(`aria-label="Pause ${verifiedTrack.title}"`);
    });
  });
});
