import { assertSafeFeedUrl } from '@/lib/ical/safe-feed-url';

/**
 * Bounded fetch for remote iCal feeds.
 *
 * Remote feeds are attacker-influenced input (an admin pastes the URL, the
 * remote host controls the response), so every fetch is capped in three ways:
 * wall-clock timeout, response body size, and redirect hops.
 *
 * See docs/security/SECURITY_AUDIT_PASS_3.md finding #17 (CWE-770).
 */

const FETCH_TIMEOUT_MS = 10_000;
const MAX_ICS_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_REDIRECTS = 3;

const FEED_HEADERS = { 'user-agent': 'FeathersHousesIcalSync/1.0' };

/**
 * Follows redirects manually so that every hop is re-checked by the SSRF
 * guard. With fetch's default `redirect: 'follow'`, a feed on an allowed host
 * could 302 to http://169.254.169.254 and defeat the finding #13 guard
 * entirely — only the first URL would ever be validated.
 */
async function fetchGuarded(rawUrl: string): Promise<Response> {
  let current = assertSafeFeedUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.toString(), {
      headers: FEED_HEADERS,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (res.status < 300 || res.status >= 400) return res;

    const location = res.headers.get('location');
    if (!location) {
      throw new Error('Calendar feed returned a redirect with no location.');
    }
    // Re-validate each hop; relative redirects resolve against the current URL.
    current = assertSafeFeedUrl(new URL(location, current).toString());
  }

  throw new Error('Calendar feed redirected too many times.');
}

/** Reads a response body as text, aborting past `maxBytes`. */
async function readCappedText(res: Response, maxBytes: number): Promise<string> {
  const declared = Number(res.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new Error('Calendar feed is too large.');
  }
  if (!res.body) return '';

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('Calendar feed is too large.');
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(merged);
}

/**
 * Validates, fetches and returns the body of a remote iCal feed.
 * Throws an Error with an admin-facing message on any failure.
 */
export async function fetchIcsText(rawUrl: string): Promise<string> {
  let res: Response;
  try {
    res = await fetchGuarded(rawUrl);
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Calendar feed timed out.');
    }
    throw err;
  }

  if (!res.ok) {
    throw new Error(`Could not fetch iCal feed (${res.status}).`);
  }
  return readCappedText(res, MAX_ICS_BYTES);
}
