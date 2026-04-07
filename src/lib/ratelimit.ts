import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Upstash-backed rate limiting for public endpoints.
 *
 * Gracefully degrades to a no-op if UPSTASH_REDIS_REST_URL or
 * UPSTASH_REDIS_REST_TOKEN are not set, so local dev and CI work
 * without Upstash credentials. In production a warning is logged
 * once per cold start when the credentials are missing.
 *
 * See security audit Finding #4 (CWE-770).
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

function makeLimiter(
  tokens: number,
  window: `${number} ${"s" | "m" | "h"}`,
): Ratelimit | null {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, window),
    analytics: false,
    prefix: "str-cursor",
  });
}

/** 5 contact form submissions per IP per 10 minutes. */
export const contactLimiter = makeLimiter(5, "10 m");

/** 10 Stripe checkout sessions per IP per hour. */
export const checkoutLimiter = makeLimiter(10, "1 h");

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

let warnedMissing = false;

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

export async function assertWithinLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    if (!warnedMissing && process.env.NODE_ENV === "production") {
      warnedMissing = true;
      console.warn(
        "[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set; rate limiting is disabled.",
      );
    }
    return { ok: true };
  }
  const result = await limiter.limit(key);
  if (result.success) return { ok: true };
  return {
    ok: false,
    retryAfter: Math.max(1, Math.ceil((result.reset - Date.now()) / 1000)),
  };
}
