/**
 * SSRF guard for admin-supplied iCal feed URLs.
 *
 * Feed URLs are pasted by admins and then fetched server-side, so without
 * filtering they let anyone with admin access aim the Vercel/Node runtime at
 * cloud metadata endpoints, loopback, or internal RFC1918 hosts.
 *
 * See docs/security/SECURITY_AUDIT_PASS_3.md finding #13 (CWE-918).
 *
 * NOTE: this validates the literal host in the URL. It does not resolve DNS,
 * so a hostname that resolves to a private address (DNS rebinding) is not
 * caught here. Blocking that requires resolving and checking the address at
 * connect time; out of scope for this pass.
 */

const BLOCKED_HOST_PATTERNS: RegExp[] = [
  /^127\./, // IPv4 loopback
  /^10\./, // RFC1918
  /^192\.168\./, // RFC1918
  /^169\.254\./, // link-local, incl. cloud metadata 169.254.169.254
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
];

const BLOCKED_HOSTS = new Set([
  'localhost',
  '0.0.0.0',
  '::1',
  '[::1]',
]);

/**
 * Validates an admin-supplied calendar URL and returns the parsed URL.
 * Throws an Error with an admin-facing message when the URL is not allowed.
 */
export function assertSafeFeedUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Calendar URL must be a valid URL.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Calendar URL must use https://');
  }

  const host = parsed.hostname.toLowerCase();

  if (
    BLOCKED_HOSTS.has(host) ||
    host.endsWith('.local') ||
    BLOCKED_HOST_PATTERNS.some((re) => re.test(host))
  ) {
    throw new Error('Calendar URL host is not allowed.');
  }

  return parsed;
}
