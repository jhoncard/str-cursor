/**
 * PriceLabs Customer API — credentials and base URL.
 *
 * Docs: https://api.swaggerhub.com/apis/Customer_API/customer_api/1.0.0-oas3
 * Use `X-API-Key` (set `PRICELABS_AUTH_BEARER=false`, the default).
 */
export function getPriceLabsConfig(): {
  apiKey: string | null;
  baseUrl: string;
  /** Customer API uses `X-API-Key`; set `PRICELABS_AUTH_BEARER=true` only for non-Customer programs. */
  useBearerAuth: boolean;
  /** PMS name for `POST /v1/listing_prices` (must match the listing in PriceLabs, e.g. airbnb). */
  pms: string;
} {
  const apiKey = process.env.PRICELABS_API_KEY?.trim() || null;
  const baseUrl =
    process.env.PRICELABS_API_BASE_URL?.trim() || "https://api.pricelabs.co/v1";
  const useBearerAuth =
    (process.env.PRICELABS_AUTH_BEARER ?? "false").toLowerCase() === "true";
  const pms = process.env.PRICELABS_PMS?.trim() || "airbnb";

  return { apiKey, baseUrl: baseUrl.replace(/\/$/, ""), useBearerAuth, pms };
}

export function isPriceLabsConfigured(): boolean {
  return Boolean(getPriceLabsConfig().apiKey);
}
