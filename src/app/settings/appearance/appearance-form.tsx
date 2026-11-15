"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  THEME_REGISTRY,
  THEMES_META,
  type ThemeKey,
  getValidThemeKey,
} from "@/lib/theme/constants";

interface AppearanceFormProps {
  initialThemeKey: ThemeKey;
  username: string;
}

export function AppearanceForm({ initialThemeKey, username }: AppearanceFormProps) {
  const [savedTheme, setSavedTheme] = useState<ThemeKey>(initialThemeKey);
  const [previewTheme, setPreviewTheme] = useState<ThemeKey>(initialThemeKey);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cardRefs = useRef<Record<ThemeKey, HTMLButtonElement | null>>({
    "obsidian-studio": null,
    "nordic-aurora": null,
    "editorial-vinyl": null,
    "crimson-vigil": null,
    "cobalt-web": null,
  });

  // Keep DOM data-theme synchronized with live preview
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", previewTheme);
  }, [previewTheme]);

  // Handle immediate visual preview when a card is selected
  const handleSelectTheme = (themeKey: ThemeKey) => {
    if (status === "saving") {
      return;
    }
    setPreviewTheme(themeKey);
    if (status === "saved" || status === "error") {
      setStatus("idle");
      setErrorMessage(null);
    }
  };

  // Keyboard navigation across radio buttons in the radiogroup
  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    if (status === "saving") {
      return;
    }
    let nextIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % THEME_REGISTRY.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + THEME_REGISTRY.length) % THEME_REGISTRY.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = THEME_REGISTRY.length - 1;
    }

    if (nextIndex !== -1) {
      const nextKey = THEME_REGISTRY[nextIndex];
      handleSelectTheme(nextKey);
      cardRefs.current[nextKey]?.focus();
    }
  };

  // Persist preference via PATCH API
  const handleSave = async () => {
    if (previewTheme === savedTheme && status === "idle") {
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/users/me/theme", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ themeKey: previewTheme }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update theme preference");
      }

      const confirmedTheme = getValidThemeKey(data.themeKey);
      setSavedTheme(confirmedTheme);
      setPreviewTheme(confirmedTheme);
      document.documentElement.setAttribute("data-theme", confirmedTheme);
      setStatus("saved");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error occurred while saving theme";
      setStatus("error");
      setErrorMessage(message);
      // Revert preview back to confirmed saved theme so user is never misled
      document.documentElement.setAttribute("data-theme", savedTheme);
      setPreviewTheme(savedTheme);
    }
  };

  // Reset to default theme ("obsidian-studio")
  const handleResetToDefault = () => {
    if (status === "saving") {
      return;
    }
    handleSelectTheme("obsidian-studio");
  };

  const hasUnsavedChanges = previewTheme !== savedTheme;
  const currentMeta = THEMES_META[previewTheme];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Header with Active Theme Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
            Appearance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose your personal theme. Theme choices are private to your account (@{username}) and never affect your friends.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-surface border border-border px-3.5 py-2 rounded-lg self-start md:self-auto">
          <div className="flex gap-1.5" aria-hidden="true">
            {currentMeta.chips.map((color, i) => (
              <span
                key={i}
                className="w-3 h-3 rounded-full border border-black/40 shadow-xs"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Active Preview: </span>
            <span className="font-medium text-foreground">{currentMeta.name}</span>
          </div>
        </div>
      </div>

      {/* Status Feedback Banners */}
      {status === "saved" && (
        <div
          role="status"
          aria-live="polite"
          className="p-3.5 rounded-lg border border-success/30 bg-success/10 text-success text-sm flex items-center justify-between"
        >
          <span>Theme preference successfully saved. Your choice is now permanent.</span>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-xs underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {status === "error" && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-center justify-between"
        >
          <span>Error: {errorMessage} — Reverted to previously saved theme.</span>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className="text-xs underline hover:no-underline ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {hasUnsavedChanges && status !== "error" && (
        <div className="p-3 rounded-lg border border-primary/40 bg-primary-subtle text-primary text-xs flex items-center justify-between">
          <span>
            You are previewing <strong>{currentMeta.name}</strong>. Click &quot;Save Theme Preference&quot; to persist it to your account.
          </span>
          <span className="font-semibold uppercase tracking-wider text-[10px] bg-primary/20 px-2 py-0.5 rounded">
            Unsaved Preview
          </span>
        </div>
      )}

      {/* Theme Cards Grid */}
      <div
        role="radiogroup"
        aria-label="Theme selection"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {THEME_REGISTRY.map((themeKey, index) => {
          const meta = THEMES_META[themeKey];
          const isSelected = previewTheme === themeKey;
          const isSaved = savedTheme === themeKey;

          return (
            <button
              key={themeKey}
              ref={(el) => {
                cardRefs.current[themeKey] = el;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              tabIndex={isSelected ? 0 : -1}
              disabled={status === "saving"}
              onClick={() => handleSelectTheme(themeKey)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              className={`group relative text-left p-5 rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                status === "saving" ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              } ${
                isSelected
                  ? "border-primary bg-surface shadow-md ring-1 ring-primary/40"
                  : "border-border bg-card hover:bg-surface-hover hover:border-border/80"
              }`}
            >
              {/* Selected / Saved Badges */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wide uppercase text-muted-foreground group-hover:text-foreground">
                  Theme 0{index + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  {isSaved && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      Saved
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary text-primary-foreground">
                      Active Preview
                    </span>
                  )}
                </div>
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-lg font-semibold text-foreground tracking-tight">
                {meta.name}
              </h2>
              <p className="text-xs font-medium text-primary mt-0.5">
                {meta.subtitle}
              </p>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                {meta.description}
              </p>

              {/* Color Swatches Palette */}
              <div className="mt-4 pt-3.5 border-t border-border/60">
                <div className="text-[11px] font-medium text-muted-foreground mb-1.5 flex justify-between">
                  <span>Palette Swatches</span>
                  <span className="font-mono text-[10px]">{meta.wcagGrade} Compliant</span>
                </div>
                <div className="grid grid-cols-4 gap-2" aria-hidden="true">
                  {meta.chips.map((chipColor, chipIdx) => (
                    <div
                      key={chipIdx}
                      className="h-7 rounded-md border border-black/30 shadow-xs flex items-center justify-center text-[9px] font-mono text-white/90 drop-shadow-sm"
                      style={{ backgroundColor: chipColor }}
                      title={chipColor}
                    />
                  ))}
                </div>
              </div>

              {/* Mini UI Preview Representation */}
              <div
                className="mt-3.5 p-2.5 rounded-lg border text-xs"
                style={{
                  backgroundColor: meta.chips[0], // canvas
                  borderColor: meta.chips[1],     // surface/border
                  color: meta.chips[3],           // text
                }}
                aria-hidden="true"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[11px]">Track Preview</span>
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: meta.chips[2] }} // accent
                  />
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-semibold"
                    style={{
                      backgroundColor: meta.chips[2],
                      color: meta.chips[0],
                    }}
                  >
                    Play
                  </span>
                  <span className="text-[10px] opacity-70 truncate">
                    Hi-Fi Sound Engine
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Controls & Commit Buttons */}
      <div className="pt-6 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={handleResetToDefault}
          disabled={status === "saving"}
          className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors cursor-pointer disabled:opacity-50"
        >
          Reset to Obsidian Studio
        </button>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {hasUnsavedChanges && (
            <button
              type="button"
              onClick={() => {
                setPreviewTheme(savedTheme);
                document.documentElement.setAttribute("data-theme", savedTheme);
                setStatus("idle");
              }}
              disabled={status === "saving"}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border transition-colors cursor-pointer disabled:opacity-50"
            >
              Revert Preview
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={status === "saving" || (!hasUnsavedChanges && status !== "error")}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {status === "saving" ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                <span>Saving Preference...</span>
              </>
            ) : (
              <span>Save Theme Preference</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
