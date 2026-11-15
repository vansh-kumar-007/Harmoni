"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AVATAR_REGISTRY,
  AVATARS_META,
  MAX_BIO_LENGTH,
  getValidAvatarKey,
  type AvatarKey,
} from "@/lib/profile/constants";
import { AvatarPreset } from "@/components/profile/avatar-preset";

interface EditProfileDialogProps {
  initialAvatarKey: string;
  initialBio: string | null;
  username: string;
  displayName: string;
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  const selector = [
    'button:not([disabled]):not([tabindex="-1"])',
    'a[href]:not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
  ].join(", ");

  const elements = Array.from(container.querySelectorAll<HTMLElement>(selector));
  return elements.filter((el) => {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  });
}

export function EditProfileDialog({
  initialAvatarKey,
  initialBio,
  username,
  displayName,
}: EditProfileDialogProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarKey>(() =>
    getValidAvatarKey(initialAvatarKey)
  );
  const [bioText, setBioText] = useState(initialBio || "");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const openModal = () => {
    setSelectedAvatar(getValidAvatarKey(initialAvatarKey));
    setBioText(initialBio || "");
    setStatus("idle");
    setErrorMessage(null);
    setIsOpen(true);
  };

  const closeModal = () => {
    if (status === "saving") return;
    setIsOpen(false);
    setStatus("idle");
    setErrorMessage(null);
    // Restore focus to the trigger element that opened the dialog
    setTimeout(() => {
      triggerButtonRef.current?.focus();
    }, 0);
  };

  // Focus close button for accessibility when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Focus trap and escape key handler
  const handleDialogKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      if (status !== "saving") {
        closeModal();
      }
      return;
    }

    if (e.key === "Tab") {
      const focusable = getFocusableElements(modalRef.current);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first || !modalRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !modalRef.current?.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  };

  // Keyboard navigation within avatar radiogroup
  const handleAvatarKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (status === "saving") return;
    let targetIndex: number | null = null;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      targetIndex = (index + 1) % AVATAR_REGISTRY.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      targetIndex = (index - 1 + AVATAR_REGISTRY.length) % AVATAR_REGISTRY.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      targetIndex = AVATAR_REGISTRY.length - 1;
    }

    if (targetIndex !== null) {
      const nextKey = AVATAR_REGISTRY[targetIndex];
      setSelectedAvatar(nextKey);
      avatarButtonRefs.current[targetIndex]?.focus();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "saving") return;

    if (bioText.length > MAX_BIO_LENGTH) {
      setErrorMessage(`Biography must not exceed ${MAX_BIO_LENGTH} characters.`);
      return;
    }

    setStatus("saving");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          avatarKey: selectedAvatar,
          bio: bioText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setStatus("idle");
      closeModal();
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const bioCharsRemaining = MAX_BIO_LENGTH - bioText.length;
  const isBioOverLimit = bioCharsRemaining < 0;

  return (
    <>
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={openModal}
        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border shadow-xs transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary shrink-0"
          aria-hidden="true"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <span>Edit Profile</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-title"
          onKeyDown={handleDialogKeyDown}
          onClick={(e) => {
            if (e.target === e.currentTarget && status !== "saving") {
              closeModal();
            }
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-xl space-y-6 text-foreground"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 id="edit-profile-title" className="text-lg font-semibold tracking-tight text-foreground">
                  Edit Profile
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update your avatar preset and biography for @{username}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeModal}
                disabled={status === "saving"}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close dialog"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {status === "error" && (
              <div
                role="alert"
                className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs"
              >
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              {/* Avatar Preset Grid */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-foreground tracking-wide">
                  Select Avatar Preset
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Handcrafted original SVG artwork stored locally at ₹0 cost. Use arrow keys to navigate.
                </p>

                <div
                  role="radiogroup"
                  aria-label="Avatar preset choices"
                  className="grid grid-cols-4 gap-3 pt-1"
                >
                  {AVATAR_REGISTRY.map((key, idx) => {
                    const meta = AVATARS_META[key];
                    const isSelected = selectedAvatar === key;

                    return (
                      <button
                        key={key}
                        ref={(el) => {
                          avatarButtonRefs.current[idx] = el;
                        }}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        disabled={status === "saving"}
                        onClick={() => setSelectedAvatar(key)}
                        onKeyDown={(e) => handleAvatarKeyDown(e, idx)}
                        className={`group relative p-2.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                          isSelected
                            ? "border-primary bg-surface shadow-xs ring-1 ring-primary/40"
                            : "border-border bg-card hover:bg-surface-hover hover:border-border/80"
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <AvatarPreset avatarKey={key} size={48} />
                        <span className="text-[10px] font-medium text-foreground mt-1.5 line-clamp-1 w-full">
                          {meta.name}
                        </span>
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Biography Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="bio-input" className="text-xs font-semibold text-foreground tracking-wide">
                    Biography
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      isBioOverLimit ? "text-destructive font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {bioText.length}/{MAX_BIO_LENGTH}
                  </span>
                </div>

                <textarea
                  id="bio-input"
                  rows={4}
                  value={bioText}
                  disabled={status === "saving"}
                  onChange={(e) => setBioText(e.target.value)}
                  placeholder={`Tell your friends about your music taste, favorite genres or gear... (max ${MAX_BIO_LENGTH} characters)`}
                  className={`w-full rounded-lg border bg-surface p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary transition-colors ${
                    isBioOverLimit ? "border-destructive focus:ring-destructive" : "border-border"
                  } disabled:opacity-50`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to display no biography.
                </p>
              </div>

              {/* Read-Only Account Identity Notice */}
              <div className="p-3 rounded-lg border border-border/80 bg-muted/40 text-[11px] text-muted-foreground flex items-center gap-2">
                <span className="font-semibold text-foreground shrink-0">Account:</span>
                <span className="truncate">
                  {displayName} (@{username}) · Username and role are managed by system invitation.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={status === "saving"}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={status === "saving" || isBioOverLimit}
                  className="px-5 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {status === "saving" ? (
                    <>
                      <span className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
