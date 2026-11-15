import React from "react";
import type { LicenseInfo } from "@/lib/music/types";

interface LicenseBadgeProps {
  license: LicenseInfo;
  className?: string;
}

export function LicenseBadge({ license, className = "" }: LicenseBadgeProps) {
  if (!license.isVerified || !license.url) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface border border-border text-muted-foreground ${className}`}
        title="Unverified or unknown license metadata. Not verified for playback."
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" aria-hidden="true" />
        <span>Unknown License</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <a
        href={license.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        title={`${license.name} (Opens official Creative Commons license deed)`}
        aria-label={`${license.name} - view legal license`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
        <span>{license.code}</span>
        <span className="text-[9px] opacity-70" aria-hidden="true">↗</span>
      </a>

      {/* Permission tags */}
      {license.nonCommercial && (
        <span
          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-border text-muted-foreground"
          title="Non-Commercial: No commercial use permitted without additional rights."
        >
          NC
        </span>
      )}
      {license.shareAlike && (
        <span
          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-border text-muted-foreground"
          title="Share-Alike: Derivative works must be licensed under identical terms."
        >
          SA
        </span>
      )}
      {license.noDerivatives && (
        <span
          className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-surface border border-border text-muted-foreground"
          title="No-Derivatives: Copying allowed only in original unedited form."
        >
          ND
        </span>
      )}
    </div>
  );
}
