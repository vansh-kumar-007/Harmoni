"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface RegisterFormProps {
  initialInviteCode?: string;
}

export function RegisterForm({ initialInviteCode = "" }: RegisterFormProps) {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    const trimmedCode = inviteCode.trim();
    const trimmedUsername = username.trim();
    const trimmedDisplayName = displayName.trim();

    if (!trimmedCode) {
      setErrorMessage("An invitation code is required to register.");
      setStatus("error");
      return;
    }

    if (trimmedCode.length < 16) {
      setErrorMessage("Invitation code must be at least 16 characters long.");
      setStatus("error");
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setErrorMessage("Username must be between 3 and 30 characters long.");
      setStatus("error");
      return;
    }

    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/.test(trimmedUsername)) {
      setErrorMessage(
        "Username may only contain letters, numbers, underscores, and hyphens, and cannot start or end with a symbol."
      );
      setStatus("error");
      return;
    }

    if (!trimmedDisplayName || trimmedDisplayName.length > 50) {
      setErrorMessage("Display name must be between 1 and 50 characters long.");
      setStatus("error");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      setStatus("error");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inviteCode: trimmedCode,
          username: trimmedUsername,
          displayName: trimmedDisplayName,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || "Registration failed. Please check your invitation code and try again."
        );
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during registration.";
      setStatus("error");
      setErrorMessage(message);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link
          href="/"
          className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface border border-border text-primary font-bold text-xl shadow-xs hover:border-primary/50 transition-colors"
          aria-label="Harmoni Home"
        >
          H
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Join Harmoni
        </h1>
        <p className="text-xs text-muted-foreground">
          Create your private circle account with an invitation code
        </p>
      </div>

      {/* Registration Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-lg space-y-6">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invitation Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="register-invite-code"
                className="block text-xs font-semibold text-foreground tracking-wide"
              >
                Invitation Code
              </label>
              <span className="text-[10px] text-muted-foreground font-mono">
                Required
              </span>
            </div>
            <input
              id="register-invite-code"
              type="text"
              name="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              required
              placeholder="Paste your 64-character invite code"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50 font-mono tracking-tight"
            />
            <p className="text-[11px] text-muted-foreground">
              Provided by a Harmoni administrator for single-use registration.
            </p>
          </div>

          {/* Username & Display Name Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Username */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-username"
                className="block text-xs font-semibold text-foreground tracking-wide"
              >
                Username
              </label>
              <input
                id="register-username"
                type="text"
                name="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={status === "submitting"}
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                placeholder="e.g. maya"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground block">
                3–30 lowercase letters & numbers
              </span>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="register-display-name"
                className="block text-xs font-semibold text-foreground tracking-wide"
              >
                Display Name
              </label>
              <input
                id="register-display-name"
                type="text"
                name="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={status === "submitting"}
                autoComplete="name"
                required
                placeholder="e.g. Maya Lin"
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50"
              />
              <span className="text-[10px] text-muted-foreground block">
                1–50 characters
              </span>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-password"
              className="block text-xs font-semibold text-foreground tracking-wide"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="register-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === "submitting"}
                autoComplete="new-password"
                required
                placeholder="Minimum 8 characters"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={status === "submitting"}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="register-confirm-password"
              className="block text-xs font-semibold text-foreground tracking-wide"
            >
              Confirm Password
            </label>
            <input
              id="register-confirm-password"
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={status === "submitting"}
              autoComplete="new-password"
              required
              placeholder="Re-enter your password"
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors disabled:opacity-50 font-mono"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card"
            >
              {status === "submitting" ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin shrink-0" />
                  <span>Registering Account...</span>
                </>
              ) : (
                <span>Complete Registration</span>
              )}
            </button>
          </div>
        </form>

        {/* Footer links */}
        <div className="pt-4 border-t border-border/80 text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary font-semibold hover:underline"
            >
              Sign in
            </Link>
          </p>
          <p className="text-[11px] text-muted-foreground/80">
            Harmoni has zero subscription fees or hidden costs (₹0 INR).
          </p>
        </div>
      </div>
    </div>
  );
}
