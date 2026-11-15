/**
 * Safe redirect destination validation utility.
 * Strictly prevents open-redirect vulnerabilities by enforcing same-origin relative paths.
 */

export function getSafeRedirectUrl(url: unknown, fallback = "/"): string {
  if (typeof url !== "string") return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Must begin with a single "/"
  if (!trimmed.startsWith("/")) return fallback;

  // Must NOT begin with "//" (protocol-relative URL)
  if (trimmed.startsWith("//")) return fallback;

  // Must NOT begin with "/\" (Windows separator / browser parser trick)
  if (trimmed.startsWith("/\\")) return fallback;

  // Must NOT contain protocol schemes
  if (trimmed.includes("://")) return fallback;

  // Must NOT contain control characters or newlines
  if (/[\u0000-\u001F\u007F]/.test(trimmed)) return fallback;

  return trimmed;
}
