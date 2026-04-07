import "server-only";

/**
 * Returns the input only if it is a safe same-origin path. Otherwise returns
 * the fallback. Used to sanitize `next` / `redirect` query parameters that
 * become Location headers, to prevent open-redirect phishing attacks.
 *
 * Safe means:
 *   - starts with exactly one "/"
 *   - does not start with "//" (protocol-relative) or "/\\" (Windows-style)
 *   - contains no "@" (userinfo), ":" (scheme), backslash, or whitespace
 *
 * See security audit Finding #7 (CWE-601).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;
  if (typeof raw !== "string") return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (/[@:\s\\]/.test(raw)) return fallback;
  return raw;
}
