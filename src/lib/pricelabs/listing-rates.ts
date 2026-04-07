import { getPriceLabsConfig } from "./config";
import { parseCustomerApiListingPricesResponse } from "./parse-rates";
import type { ListingDailyRate } from "./types";

export type { ListingDailyRate };

/**
 * `GET /v1/listings/{id}` returns the canonical `pms` for that listing.
 * Using env `PRICELABS_PMS` alone often causes LISTING_NOT_PRESENT on `listing_prices`
 * when it does not match the listing’s real PMS in PriceLabs.
 */
function readPushEnabled(row: Record<string, unknown>): boolean | null {
  const v = row.push_enabled;
  if (v === true) return true;
  if (v === false) return false;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s === "true" || s === "1") return true;
    if (s === "false" || s === "0") return false;
  }
  return null;
}

/** `GET /v1/listings/{id}` — PMS + whether Sync is ON (`push_enabled` in Customer API). */
async function fetchListingMeta(
  listingId: string,
  baseUrl: string,
  apiKey: string,
  useBearerAuth: boolean,
  fallbackPms: string,
  fetchExtras: { next?: { revalidate: number } } = {}
): Promise<{ pms: string; pushEnabled: boolean | null; name: string | null }> {
  const url = `${baseUrl}/listings/${encodeURIComponent(listingId)}`;
  const headers = new Headers();
  if (useBearerAuth) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  } else {
    headers.set("X-API-Key", apiKey);
  }

  const res = await fetch(url, { method: "GET", headers, ...fetchExtras });
  const text = await res.text();

  if (!res.ok) {
    const snippet = text.slice(0, 400);
    throw new Error(
      `PriceLabs listing lookup failed (${res.status}). No listing with id "${listingId}" for this API key. ` +
        `In PriceLabs, open the listing and copy its ID, or check Settings → API uses the same account. ${snippet}`
    );
  }

  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("PriceLabs returned invalid JSON for GET /v1/listings/{id}.");
  }

  const listings = (data as { listings?: unknown[] } | null)?.listings;
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new Error(
      `PriceLabs: No listing returned for id "${listingId}". ` +
        `Use the numeric listing ID from the listing row in PriceLabs (not your API key from Settings → API). ` +
        `The API key belongs only in PRICELABS_API_KEY in your server env.`
    );
  }
  const first = listings[0] as Record<string, unknown>;
  const pmsRaw = first?.pms;
  const pms =
    typeof pmsRaw === "string" && pmsRaw.trim() ? pmsRaw.trim() : fallbackPms;
  const pushEnabled = readPushEnabled(first);
  const name = typeof first.name === "string" ? first.name : null;

  return { pms, pushEnabled, name };
}

/** Customer API: `GET /v1/listings/{id}` then `POST /v1/listing_prices`. */
async function fetchListingRatesImpl(
  priceLabsListingId: string,
  from: string,
  to: string,
  fetchExtras: { next?: { revalidate: number } } = {}
): Promise<ListingDailyRate[]> {
  const { apiKey, baseUrl, useBearerAuth, pms } = getPriceLabsConfig();
  if (!apiKey) {
    throw new Error("PRICELABS_API_KEY is not set.");
  }

  const idTrim = priceLabsListingId.trim();
  if (idTrim === apiKey.trim()) {
    throw new Error(
      "PriceLabs listing ID cannot be the same as your API key. " +
        "In admin, paste the numeric listing ID from the PriceLabs dashboard for this property. " +
        "Keep the API key only in PRICELABS_API_KEY (environment variables), not in the listing ID field."
    );
  }

  const meta = await fetchListingMeta(
    idTrim,
    baseUrl,
    apiKey,
    useBearerAuth,
    pms,
    fetchExtras
  );

  if (meta.pushEnabled === false) {
    const label = meta.name ? `"${meta.name}"` : "this listing";
    throw new Error(
      `PriceLabs: Sync is OFF for ${label} (id ${idTrim}). The Customer API only returns prices when Sync is ON. ` +
        `In PriceLabs, open Pricing or Multi-Calendar, find this listing, turn Sync ON for channel ${meta.pms}, ` +
        `then Save and Refresh. Wait a minute and try again.`
    );
  }

  const url = `${baseUrl}/listing_prices`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (useBearerAuth) {
    headers.set("Authorization", `Bearer ${apiKey}`);
  } else {
    headers.set("X-API-Key", apiKey);
  }

  const body = JSON.stringify({
    listings: [
      {
        id: idTrim,
        pms: meta.pms,
        dateFrom: from,
        dateTo: to,
      },
    ],
  });

  const res = await fetch(url, { method: "POST", headers, body, ...fetchExtras });

  const bodyText = await res.text();
  if (!res.ok) {
    const snippet = bodyText.slice(0, 800);
    throw new Error(
      `PriceLabs request failed (${res.status} ${res.statusText}). ${snippet || "Empty response body."}`
    );
  }

  let data: unknown;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    throw new Error(
      "PriceLabs returned a non-JSON body. Check PRICELABS_API_BASE_URL (expect https://api.pricelabs.co/v1)."
    );
  }

  return parseCustomerApiListingPricesResponse(data, idTrim);
}

/** Next.js route handlers / RSC: 1-hour fetch cache. */
export async function getListingRatesCached(
  priceLabsListingId: string,
  from: string,
  to: string
): Promise<ListingDailyRate[]> {
  return fetchListingRatesImpl(priceLabsListingId, from, to, { next: { revalidate: 3600 } });
}

/** CLI and non-Next runtimes (no `next` fetch cache). */
export async function fetchListingRatesUncached(
  priceLabsListingId: string,
  from: string,
  to: string
): Promise<ListingDailyRate[]> {
  return fetchListingRatesImpl(priceLabsListingId, from, to);
}
