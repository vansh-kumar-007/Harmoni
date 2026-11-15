import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getValidThemeKey, THEMES_META } from "@/lib/theme/constants";
import { AvatarPreset } from "@/components/profile/avatar-preset";
import { LogoutButton } from "@/components/auth/logout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Harmoni — Private Social Music",
  description: "A private, invitation-only social music sanctuary for close friends.",
};

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    // UNAUTHENTICATED LANDING VIEW
    return (
      <main className="min-h-full flex-1 flex flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-4xl mx-auto space-y-12 text-center">
          {/* Hero Section */}
          <div className="space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Private Social Music Circle</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground">
              Harmoni
            </h1>

            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              A private, invitation-only music sanctuary crafted for 5–15 close friends.
              Stream legal Creative Commons audio, log genuine scrobbles, share playlists,
              and customize your visual aesthetic at a permanent ₹0 operating budget.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                href="/login"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Sign In to Your Circle</span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span>Join with Invitation Code</span>
              </Link>
            </div>
          </div>

          {/* Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left pt-6 border-t border-border/80">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary font-bold text-base border border-border/80">
                ♫
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Legal CC Music Streaming
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Stream legal audio powered by Creative Commons licenses with verified artist attribution badges and zero subscription fees.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary font-bold text-base border border-border/80">
                ♪
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Genuine Scrobbling
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Last.fm-style playback verification strictly enforcing the 50% or 30-second rule with zero fake activity or inflated plays.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-border bg-card space-y-2">
              <div className="w-9 h-9 rounded-xl bg-surface flex items-center justify-center text-primary font-bold text-base border border-border/80">
                ✦
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Multi-Theme Aesthetics
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose from five handcrafted visual themes: Obsidian Studio, Nordic Aurora, Editorial Vinyl, Crimson Vigil, and Cobalt Web.
              </p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-xs text-muted-foreground/80 pt-4">
            Harmoni • Pure Open Source (AGPL-3.0) • Permanent ₹0 INR Operating Cost
          </div>
        </div>
      </main>
    );
  }

  // AUTHENTICATED DASHBOARD VIEW
  const activeTheme = getValidThemeKey(user.themeKey);
  const themeMeta = THEMES_META[activeTheme];

  return (
    <main className="min-h-full flex-1 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* Welcome Greeting Banner */}
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <AvatarPreset
                avatarKey={user.avatarKey}
                size={88}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-primary/40 bg-surface shadow-md shrink-0"
                showHalo
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    Welcome back, {user.displayName}
                  </h1>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      user.role === "ADMIN"
                        ? "bg-primary/20 text-primary border-primary/40 font-mono"
                        : "bg-muted text-muted-foreground border-border font-mono"
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-foreground">@{user.username}</span>
                  <span>·</span>
                  <span>Theme: {themeMeta.name}</span>
                </div>
                {user.bio && (
                  <p className="text-xs text-foreground/90 pt-1 line-clamp-2 max-w-xl">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 self-end sm:self-center">
              <LogoutButton />
            </div>
          </div>
        </div>

        {/* Dashboard Navigation Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1: Your Profile */}
          <Link
            href={`/@${user.username}`}
            className="group p-6 rounded-2xl border border-border bg-card hover:bg-surface-hover hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary font-bold border border-border group-hover:scale-105 transition-transform">
                👤
              </div>
              <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Your Profile
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                View your shared playlists, customize your avatar preset, and check your listening history scrobbles.
              </p>
            </div>
            <div className="text-xs font-semibold text-primary flex items-center gap-1 pt-2 border-t border-border/60">
              <span>View Profile</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>

          {/* Card 2: Appearance Settings */}
          <Link
            href="/settings/appearance"
            className="group p-6 rounded-2xl border border-border bg-card hover:bg-surface-hover hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-primary font-bold border border-border group-hover:scale-105 transition-transform">
                🎨
              </div>
              <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                Appearance Settings
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Choose your personal visual theme preference. Currently set to{" "}
                <span className="text-foreground font-medium">{themeMeta.name}</span>.
              </p>
            </div>
            <div className="text-xs font-semibold text-primary flex items-center gap-1 pt-2 border-t border-border/60">
              <span>Change Theme</span>
              <span aria-hidden="true">→</span>
            </div>
          </Link>

          {/* Card 3: Admin Invitations (Only visible if ADMIN) */}
          {user.role === "ADMIN" && (
            <Link
              href="/admin/invitations"
              className="group p-6 rounded-2xl border border-primary/30 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/40 group-hover:scale-105 transition-transform">
                  🎟️
                </div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    Member Invitations
                  </h2>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/20 text-primary font-bold">
                    ADMIN
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Generate secure 256-bit single-use invitation codes for new friends to register on Harmoni.
                </p>
              </div>
              <div className="text-xs font-semibold text-primary flex items-center gap-1 pt-2 border-t border-primary/20">
                <span>Manage Invitations</span>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          )}
        </div>

        {/* Milestone Roadmap Status Banner */}
        <div className="p-5 rounded-2xl border border-border bg-surface/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <span className="font-semibold text-foreground block">
              Music Engine Ready for Milestone 4
            </span>
            <p className="text-[11px] leading-relaxed">
              Your authentication and identity foundation is verified. Next milestone: Jamendo API legal streaming integration & music search.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-[11px] font-mono shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>₹0 Operating Budget</span>
          </div>
        </div>
      </div>
    </main>
  );
}
