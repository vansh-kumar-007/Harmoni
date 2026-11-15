import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/dal";
import { InviteGenerator } from "./invite-generator";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Invitation Management — Harmoni Admin",
  description: "Generate and manage private invitation codes for Harmoni",
};

export default async function AdminInvitationsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?returnTo=/admin/invitations");
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="min-h-full flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md p-8 rounded-2xl border border-destructive/30 bg-card text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center text-destructive text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Administrative Access Required
          </h1>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Only users with the administrator role can access invitation management and generate member invitation codes.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold bg-surface hover:bg-surface-hover text-foreground border border-border transition-colors cursor-pointer"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full flex-1 py-10 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Harmoni
          </Link>
          <span>/</span>
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground font-medium">Invitations</span>
        </div>

        {/* Header Card */}
        <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/30 mb-2">
                ADMIN ACCESS GRANTED
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Generate Member Invitation
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Create a 256-bit single-use invitation code for a friend to join Harmoni.
              </p>
            </div>
          </div>

          {/* Interactive Generator */}
          <InviteGenerator />

          {/* Security & Architecture Guarantees Box */}
          <div className="rounded-xl border border-border bg-surface/50 p-4 space-y-2 text-xs text-muted-foreground">
            <h2 className="font-semibold text-foreground text-xs">
              Harmoni Invitation Security Guarantees
            </h2>
            <ul className="list-disc list-inside space-y-1 text-[11px] leading-relaxed">
              <li>
                <strong>Single-Use Only:</strong> Each invitation code can only be redeemed once. The database enforces atomic single-user redemption.
              </li>
              <li>
                <strong>Zero Plaintext Storage:</strong> Only the SHA-256 digest is stored in PostgreSQL. Database dumps cannot reveal plaintext codes.
              </li>
              <li>
                <strong>Audit Logged:</strong> All invitations record the administrator ID who generated them and the user ID who redeemed them.
              </li>
              <li>
                <strong>Shown Once:</strong> Plaintext codes are generated in-memory and never cached in browser storage or logs.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
