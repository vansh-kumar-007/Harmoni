"use client";

import React, { useState } from "react";
import { isValidImageUrl } from "@/lib/profile/constants";

interface ArtworkImageProps {
  src: string | null | undefined;
  alt: string;
  size?: "sm" | "md" | "lg";
  fallbackIcon?: "note" | "playlist";
  className?: string;
}

export function ArtworkImage({
  src,
  alt,
  size = "md",
  fallbackIcon = "note",
  className = "",
}: ArtworkImageProps) {
  // Track specific failed URLs without synchronous setState in effect
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const isValid = isValidImageUrl(src);
  const hasError = Boolean(src && failedSrc === src);

  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[size];

  const icon = fallbackIcon === "playlist" ? "♫" : "♪";

  if (!isValid || hasError || !src) {
    return (
      <div
        className={`${sizeClasses} rounded-lg bg-surface flex items-center justify-center text-primary font-bold border border-border/80 shrink-0 select-none ${className}`}
        aria-hidden="true"
      >
        <span>{icon}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClasses} rounded-lg overflow-hidden shrink-0 border border-border/80 bg-surface ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className="w-full h-full object-cover"
      />
    </div>
  );
}
