/**
 * Airbnb CDN often rejects or breaks Next.js image optimizer fetches.
 * Use `unoptimized` on next/image when the URL is served from there.
 */
export function isAirbnbOptimizerHost(src: string): boolean {
  return src.startsWith("https://a0.muscache.com/");
}
