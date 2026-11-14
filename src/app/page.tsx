export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-md space-y-4 rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs font-medium text-primary">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          Milestone 1 Initialized
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Harmoni
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Open-source, personal-scale social music platform. Foundation verified
          with Next.js 16, TypeScript, Tailwind CSS v4, and shadcn/ui tooling.
        </p>
        <div className="pt-2 text-xs text-muted-foreground/80">
          Budget: ₹0 INR • Pure Open Source (AGPL-3.0)
        </div>
      </div>
    </main>
  );
}
