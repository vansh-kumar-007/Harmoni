import React from "react";
import Link from "next/link";
import type { SafeUser } from "@/lib/auth/session";
import { AvatarPreset } from "@/components/profile/avatar-preset";
import { LogoutButton } from "@/components/auth/logout-button";

interface NavbarProps {
  user: SafeUser | null;
}

export function Navbar({ user }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 backdrop-blur-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 text-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg px-1.5 py-1"
          aria-label="Harmoni Home"
        >
          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-primary font-bold text-sm shadow-2xs">
            H
          </div>
          <span className="font-bold tracking-tight text-sm">Harmoni</span>
        </Link>

        {/* Navigation Items */}
        <nav
          aria-label="Main Navigation"
          className="flex items-center gap-2 sm:gap-3 text-xs"
        >
          {user ? (
            <>
              {/* Profile Link */}
              <Link
                href={`/@${user.username}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <AvatarPreset
                  avatarKey={user.avatarKey}
                  size={20}
                  className="w-5 h-5 rounded-full border border-border shrink-0"
                />
                <span className="font-medium hidden sm:inline-block">
                  @{user.username}
                </span>
              </Link>

              {/* Appearance Link */}
              <Link
                href="/settings/appearance"
                className="px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Theme</span>
              </Link>

              {/* Admin Invitations Link (if Admin) */}
              {user.role === "ADMIN" && (
                <Link
                  href="/admin/invitations"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-medium text-primary hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Invitations</span>
                </Link>
              )}

              {/* Logout Button */}
              <LogoutButton variant="nav" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-lg font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Join with Invite
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
