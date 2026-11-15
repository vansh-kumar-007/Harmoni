"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  variant?: "default" | "nav" | "ghost";
  redirectTo?: string;
  className?: string;
}

export function LogoutButton({
  variant = "default",
  redirectTo = "/",
  className = "",
}: LogoutButtonProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    if (status === "loading") return;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to log out");
      }

      setStatus("idle");
      router.push(redirectTo);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  const baseStyle =
    "inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";

  const variantStyles = {
    default:
      "px-3.5 py-1.5 bg-surface hover:bg-surface-hover text-foreground border border-border shadow-xs",
    nav: "px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-surface rounded-md",
    ghost: "px-2 py-1 text-muted-foreground hover:text-destructive",
  }[variant];

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleLogout}
        disabled={status === "loading"}
        className={`${baseStyle} ${variantStyles} ${className}`}
        aria-label="Sign out of Harmoni"
      >
        {status === "loading" ? (
          <>
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Signing Out...</span>
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
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </>
        )}
      </button>

      {status === "error" && errorMessage && (
        <span
          role="alert"
          className="absolute top-full mt-1.5 right-0 text-[11px] text-destructive whitespace-nowrap bg-destructive/10 border border-destructive/30 px-2 py-0.5 rounded shadow-sm z-10"
        >
          {errorMessage}
        </span>
      )}
    </div>
  );
}
