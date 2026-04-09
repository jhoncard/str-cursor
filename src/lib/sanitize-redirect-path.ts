/** Same rules as server-only safeInternalPath — usable from client components. */
export function sanitizeRedirectPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw || typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[@:\s\\]/.test(raw)) return fallback;
  return raw;
}
