/**
 * PriceLabs Open / Partner API — credentials and base URL.
 *
 * Obtain API access from PriceLabs (support@pricelabs.co / Dynamic Pricing API program).
 * Exact paths vary by program; see `client.ts` and `.env.example`.
 */
export function getPriceLabsConfig(): {
  apiKey: string | null;
  baseUrl: string;
  /** When true, send `Authorization: Bearer <key>` (set false if PriceLabs gives a header name). */
  useBearerAuth: boolean;
} {
  const apiKey = process.env.PRICELABS_API_KEY?.trim() || null;
  const baseUrl =
    process.env.PRICELABS_API_BASE_URL?.trim() || "https://api.pricelabs.co/v1";
  const useBearerAuth =
    (process.env.PRICELABS_AUTH_BEARER ?? "true").toLowerCase() !== "false";

  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ""), useBearerAuth };
}

export function isPriceLabsConfigured(): boolean {
  return Boolean(getPriceLabsConfig().apiKey);
}
