import React from "react";
import { getValidAvatarKey, AVATARS_META, type AvatarKey } from "@/lib/profile/constants";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | number;

interface AvatarPresetProps extends React.SVGProps<SVGSVGElement> {
  avatarKey?: string | null;
  size?: AvatarSize;
  className?: string;
  showHalo?: boolean;
}

const SIZE_MAP: Record<"xs" | "sm" | "md" | "lg" | "xl", number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 80,
  xl: 112,
};

export function AvatarPreset({
  avatarKey,
  size = "md",
  className = "",
  showHalo = false,
  ...svgProps
}: AvatarPresetProps) {
  const validKey: AvatarKey = getValidAvatarKey(avatarKey);
  const meta = AVATARS_META[validKey];

  const dimension = typeof size === "number" ? size : SIZE_MAP[size] || 48;

  const renderSvgContent = () => {
    switch (validKey) {
      case "avatar_1":
        return (
          <>
            <rect x="6" y="6" width="52" height="52" rx="10" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <circle cx="28" cy="32" r="18" fill="#0b0c10" stroke="#252937" strokeWidth="1.5" />
            <circle cx="28" cy="32" r="13" stroke="#1f2330" strokeWidth="1" />
            <circle cx="28" cy="32" r="8" stroke="#1f2330" strokeWidth="1" />
            <circle cx="28" cy="32" r="5" fill="#f59e0b" />
            <circle cx="28" cy="32" r="1.5" fill="#0b0c10" />
            <circle cx="49" cy="17" r="3.5" fill="#252937" stroke="#f59e0b" strokeWidth="1.5" />
            <path d="M49 17L44 33L37 36" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="34" y="34.5" width="4" height="3" rx="0.8" transform="rotate(-25 34 34.5)" fill="#f59e0b" />
            <circle cx="12" cy="48" r="2" fill="#f59e0b" />
          </>
        );

      case "avatar_2":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <circle cx="32" cy="27" r="14" fill="url(#tube-glow-avatar-2)" opacity="0.4" />
            <path d="M22 47H42V51C42 52.1 41.1 53 40 53H24C22.9 53 22 52.1 22 51V47Z" fill="#1c202c" stroke="#252937" strokeWidth="1.5" />
            <line x1="26" y1="53" x2="26" y2="56" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="53" x2="32" y2="56" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="38" y1="53" x2="38" y2="56" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M21 47V23C21 16.9 25.9 12 32 12C38.1 12 43 16.9 43 23V47" stroke="#4b5563" strokeWidth="1.5" fill="rgba(245, 158, 11, 0.04)" />
            <rect x="25" y="20" width="14" height="19" rx="2" fill="#1c202c" stroke="#374151" strokeWidth="1" />
            <path d="M28 35L30 24L32 35L34 24L36 35" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="28" y1="23" x2="36" y2="23" stroke="#f59e0b" strokeWidth="1.5" />
            <defs>
              <radialGradient id="tube-glow-avatar-2" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>
          </>
        );

      case "avatar_3":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <line x1="12" y1="32" x2="52" y2="32" stroke="#252937" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="32" y1="12" x2="32" y2="52" stroke="#252937" strokeWidth="1" strokeDasharray="2 2" />
            <path d="M12 32C18 44 26 44 32 32C38 20 46 20 52 32" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
            <path d="M10 32C16 16 22 16 28 32C34 48 40 48 46 32C49 24 52 24 54 32" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M14 32C17 26 19 38 22 32C25 26 27 38 30 32C33 26 35 38 38 32C41 26 43 38 46 32C48 28 50 34 51 32" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
            <circle cx="20" cy="21" r="2" fill="#fbbf24" />
            <circle cx="38" cy="43" r="2" fill="#f59e0b" />
          </>
        );

      case "avatar_4":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#0b0c10" stroke="#252937" strokeWidth="2" />
            <circle cx="32" cy="32" r="22" stroke="#1c202c" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="18" stroke="#181b26" strokeWidth="1.2" />
            <circle cx="32" cy="32" r="14" stroke="#1c202c" strokeWidth="1.2" />
            <path d="M32 32L18 10C22.2 7.4 27 6 32 6C37 6 41.8 7.4 46 10L32 32Z" fill="white" fillOpacity="0.04" />
            <path d="M32 32L46 54C41.8 56.6 37 58 32 58C27 58 22.2 56.6 18 54L32 32Z" fill="white" fillOpacity="0.04" />
            <circle cx="32" cy="32" r="10" fill="#f59e0b" stroke="#fbbf24" strokeWidth="1" />
            <circle cx="32" cy="32" r="3.2" fill="#0b0c10" stroke="#d97706" strokeWidth="1" />
            <circle cx="32" cy="25" r="1" fill="#78350f" />
            <circle cx="32" cy="39" r="1" fill="#78350f" />
          </>
        );

      case "avatar_5":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#08090d" stroke="#22293d" strokeWidth="2" />
            <path d="M8 35L26 31" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M36 29L56 18" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
            <path d="M37 32L57 32" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
            <path d="M36 35L56 46" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
            <polygon points="32,13 18,47 46,47" fill="#111420" stroke="#38435d" strokeWidth="1.5" />
            <polygon points="32,13 28,47 46,47" fill="rgba(6, 182, 212, 0.08)" />
            <line x1="26" y1="31" x2="36" y2="32" stroke="#f8fafc" strokeWidth="1.8" strokeDasharray="2 1" />
          </>
        );

      case "avatar_6":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <rect x="12" y="18" width="40" height="28" rx="4" fill="#181b26" stroke="#252937" strokeWidth="1.5" />
            <rect x="16" y="21" width="32" height="15" rx="2" fill="#11131a" stroke="#252937" strokeWidth="1" />
            <rect x="21" y="24" width="22" height="9" rx="1.5" fill="#0b0c10" stroke="#374151" strokeWidth="1" />
            <circle cx="26" cy="28.5" r="3.2" fill="#1c202c" stroke="#f59e0b" strokeWidth="1.2" />
            <circle cx="26" cy="28.5" r="1.2" fill="#fbbf24" />
            <circle cx="38" cy="28.5" r="3.2" fill="#1c202c" stroke="#f59e0b" strokeWidth="1.2" />
            <circle cx="38" cy="28.5" r="1.2" fill="#fbbf24" />
            <line x1="29.2" y1="28.5" x2="34.8" y2="28.5" stroke="#d97706" strokeWidth="1" />
            <polygon points="17,42 47,42 43,46 21,46" fill="#11131a" stroke="#252937" strokeWidth="1" />
            <circle cx="24" cy="44" r="1" fill="#9ca3af" />
            <circle cx="40" cy="44" r="1" fill="#9ca3af" />
          </>
        );

      case "avatar_7":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <line x1="14" y1="46" x2="50" y2="46" stroke="#252937" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="18" y1="44" x2="18" y2="30" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="18" cy="25" r="1.8" fill="#fbbf24" />
            <line x1="25" y1="44" x2="25" y2="22" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="25" cy="17" r="1.8" fill="#fbbf24" />
            <line x1="32" y1="44" x2="32" y2="16" stroke="#fbbf24" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="32" cy="11" r="1.8" fill="#ffffff" />
            <line x1="39" y1="44" x2="39" y2="26" stroke="#f59e0b" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="39" cy="21" r="1.8" fill="#fbbf24" />
            <line x1="46" y1="44" x2="46" y2="34" stroke="#d97706" strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="46" cy="29" r="1.8" fill="#fbbf24" />
          </>
        );

      case "avatar_8":
        return (
          <>
            <circle cx="32" cy="32" r="26" fill="#14161f" stroke="#252937" strokeWidth="2" />
            <circle cx="32" cy="32" r="22" stroke="#374151" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" />
            <circle cx="32" cy="32" r="17" stroke="#d97706" strokeWidth="1.2" strokeDasharray="5 3" opacity="0.7" />
            <circle cx="32" cy="32" r="11" stroke="#f59e0b" strokeWidth="1.6" opacity="0.9" />
            <circle cx="32" cy="32" r="6" stroke="#fbbf24" strokeWidth="1.8" />
            <circle cx="32" cy="32" r="2.5" fill="#ffffff" />
            <line x1="32" y1="7" x2="32" y2="9" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="32" y1="55" x2="32" y2="57" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="7" y1="32" x2="9" y2="32" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="55" y1="32" x2="57" y2="32" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />
          </>
        );
    }
  };

  const ringClasses = showHalo
    ? "rounded-full ring-2 ring-primary/60 shadow-[0_0_24px_rgba(245,158,11,0.18)]"
    : "";

  return (
    <svg
      viewBox="0 0 64 64"
      width={dimension}
      height={dimension}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={meta.concept}
      className={`shrink-0 transition-transform ${ringClasses} ${className}`}
      {...svgProps}
    >
      <title>{meta.name}</title>
      {renderSvgContent()}
    </svg>
  );
}
