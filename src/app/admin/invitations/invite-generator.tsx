"use client";

import React, { useState } from "react";

export function InviteGenerator() {
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [status, setStatus] = useState<"idle" | "generating" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    id: string;
    inviteCode: string;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "generating") return;

    setStatus("generating");
    setErrorMessage(null);
    setCopied(false);

    try {
      const response = await fetch("/api/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expiresInDays: Number(expiresInDays),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate invitation code");
      }

      setGeneratedInvite(data.invite);
      setStatus("success");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const handleCopy = async () => {
    if (!generatedInvite) return;

    try {
      await navigator.clipboard.writeText(generatedInvite.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for browsers without clipboard permissions
      setCopied(false);
    }
  };

  const handleReset = () => {
    setGeneratedInvite(null);
    setStatus("idle");
    setErrorMessage(null);
    setCopied(false);
  };

  const formatUtcDate = (dateString: string) => {
    return (
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
      }).format(new Date(dateString)) + " UTC"
    );
  };

  return (
    <div className="space-y-6">
      {status === "error" && errorMessage && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium flex items-start gap-2.5"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {status === "success" && generatedInvite ? (
        /* Newly Generated Code Display Card */
        <div className="p-6 rounded-2xl border-2 border-primary/40 bg-surface shadow-md space-y-5">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span>Invitation Code Created</span>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="generated-code-display"
              className="block text-xs font-semibold text-foreground tracking-wide"
            >
              Single-Use Invitation Code
            </label>
            <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <code
                id="generated-code-display"
                className="font-mono text-xs text-primary font-bold break-all select-all tracking-wider"
              >
                {generatedInvite.inviteCode}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {copied ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs space-y-1">
            <span className="font-semibold block">⚠️ Shown Once Policy</span>
            <p className="text-[11px] leading-relaxed text-amber-200/90">
              This plaintext code is displayed exactly once and cannot be retrieved again from the database. Share it privately with your friend.
            </p>
          </div>

          <div className="text-[11px] text-muted-foreground flex items-center justify-between border-t border-border/80 pt-3">
            <span>Valid Until:</span>
            <span className="font-mono text-foreground font-medium">
              {formatUtcDate(generatedInvite.expiresAt)}
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-colors cursor-pointer"
            >
              Generate Another Invitation Code
            </button>
          </div>
        </div>
      ) : (
        /* Invitation Creation Form */
        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="invite-expiration-select"
              className="block text-xs font-semibold text-foreground tracking-wide"
            >
              Invitation Validity Period
            </label>
            <select
              id="invite-expiration-select"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              disabled={status === "generating"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value={1}>1 Day (24 Hours)</option>
              <option value={3}>3 Days</option>
              <option value={7}>7 Days (Recommended Default)</option>
              <option value={14}>14 Days (Two Weeks)</option>
              <option value={30}>30 Days (Maximum Allowed)</option>
            </select>
            <p className="text-[11px] text-muted-foreground">
              After this timeframe, unredeemed codes expire atomically in PostgreSQL.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "generating"}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
            >
              {status === "generating" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Generating Secure Code...</span>
                </>
              ) : (
                <span>Generate 256-Bit Invitation Code</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
