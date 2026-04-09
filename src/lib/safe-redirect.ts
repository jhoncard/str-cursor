import "server-only";

import { sanitizeRedirectPath } from "@/lib/sanitize-redirect-path";

/**
 * Returns the input only if it is a safe same-origin path. Otherwise returns
 * the fallback. Used to sanitize `next` / `redirect` query parameters that
 * become Location headers, to prevent open-redirect phishing attacks.
 *
 * See security audit Finding #7 (CWE-601).
 */
export function safeInternalPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  return sanitizeRedirectPath(raw, fallback);
}
