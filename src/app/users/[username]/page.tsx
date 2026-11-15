import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { AvatarPreset } from "@/components/profile/avatar-preset";
import { EditProfileDialog } from "@/components/profile/edit-profile-dialog";
import { ProfileTabs } from "./profile-tabs";

export const dynamic = "force-dynamic";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const normalized = username.toLowerCase().replace(/^@/, "");

  const user = await db.user.findUnique({
    where: { username: normalized },
    select: { displayName: true, username: true },
  });

  if (!user) {
    return {
      title: "User Not Found — Harmoni",
      description: "No member found on Harmoni with this handle.",
    };
  }

  return {
    title: `${user.displayName} (@${user.username}) — Harmoni`,
    description: `Harmoni member profile for ${user.displayName}.`,
  };
}

export default async function UserProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const normalizedUsername = username.toLowerCase().replace(/^@/, "");

  // 1. Fetch user record with selective fields (strictly excluding passwordHash and sessions)
  const user = await db.user.findUnique({
    where: { username: normalizedUsername },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarKey: true,
      bio: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    notFound();
  }

  // 2. Fetch public playlists created by the user (excluding private playlists)
  const publicPlaylists = await db.playlist.findMany({
    where: {
      userId: user.id,
      isPublic: true,
    },
    select: {
      id: true,
      title: true,
      description: true,
      coverUrl: true,
      createdAt: true,
      _count: {
        select: {
          tracks: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 3. Fetch completed scrobble statistics and recent listening activity
  const totalScrobbles = await db.scrobble.count({
    where: {
      userId: user.id,
      isCompleted: true,
    },
  });

  const recentScrobbles = await db.scrobble.findMany({
    where: {
      userId: user.id,
      isCompleted: true,
    },
    include: {
      track: {
        select: {
          id: true,
          title: true,
          artistName: true,
          albumName: true,
          durationMs: true,
          coverUrl: true,
        },
      },
    },
    orderBy: { listenedAt: "desc" },
    take: 6,
  });

  // 4. Determine viewer ownership
  const currentUser = await getCurrentUser();
  const isOwner = currentUser?.id === user.id;

  const memberSinceFormatted = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(user.createdAt));

  return (
    <main className="min-h-full flex-1 py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Harmoni
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">@{user.username}</span>
        </div>

        {/* Profile Header Hero Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Circular Avatar with Ambient Halo */}
              <div className="relative shrink-0">
                <AvatarPreset
                  avatarKey={user.avatarKey}
                  size={112}
                  className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-2 border-primary/40 bg-surface shadow-md"
                  showHalo
                />
              </div>

              {/* Identity & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {user.displayName}
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
                  <span>Member since {memberSinceFormatted}</span>
                </div>

                {/* Biography */}
                {user.bio ? (
                  <p className="text-xs sm:text-sm text-foreground/90 max-w-xl leading-relaxed pt-1">
                    {user.bio}
                  </p>
                ) : isOwner ? (
                  <p className="text-xs text-muted-foreground/80 italic pt-1">
                    No bio yet. Click &quot;Edit Profile&quot; to share your musical tastes with your circle.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Self-Edit Action vs Non-Owner Member Tag */}
            <div className="self-end sm:self-center shrink-0">
              {isOwner ? (
                <EditProfileDialog
                  initialAvatarKey={user.avatarKey}
                  initialBio={user.bio}
                  username={user.username}
                  displayName={user.displayName}
                />
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface text-muted-foreground border border-border">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
                  <span>Harmoni Member</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Profile Sections */}
        <ProfileTabs
          username={user.username}
          isOwner={isOwner}
          publicPlaylists={publicPlaylists}
          recentScrobbles={recentScrobbles}
          totalScrobbles={totalScrobbles}
        />
      </div>
    </main>
  );
}
