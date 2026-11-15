import { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { getValidThemeKey } from "@/lib/theme/constants";
import { AppearanceForm } from "./appearance-form";

export const metadata: Metadata = {
  title: "Appearance — Harmoni",
  description: "Customize your personal Harmoni visual theme preference",
};

export default async function AppearanceSettingsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-full flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-xl border border-border bg-card text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center text-primary text-xl font-bold">
            H
          </div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Authentication Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Theme preferences are stored privately per user. Please sign in to your Harmoni account to select and customize your personal visual experience.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-colors cursor-pointer"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const themeKey = getValidThemeKey(user.themeKey);

  return (
    <main className="min-h-full flex-1 py-10 px-4 sm:px-6 lg:px-8">
      <AppearanceForm initialThemeKey={themeKey} username={user.username} />
    </main>
  );
}
