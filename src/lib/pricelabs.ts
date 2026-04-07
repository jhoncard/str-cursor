import "server-only";

export type { ListingDailyRate } from "./pricelabs/types";
export { fetchListingRatesUncached } from "./pricelabs/listing-rates";
import { getListingRatesCached } from "./pricelabs/listing-rates";

/**
 * Fetch nightly rates via Customer API `POST /v1/listing_prices`. Cached for 1 hour (ISR-style).
 * Use `X-API-Key` unless `PRICELABS_AUTH_BEARER=true`.
 */
export async function getListingRates(
  priceLabsListingId: string,
  from: string,
  to: string
) {
  return getListingRatesCached(priceLabsListingId, from, to);
}
