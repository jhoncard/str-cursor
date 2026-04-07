import "server-only";

import { addDays, format } from "date-fns";
import { db } from "@/lib/db";
import { availability, properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { isPriceLabsConfigured } from "./config";
import { priceLabsJson } from "./client";
import { parseRatesFromUnknownPayload } from "./parse-rates";

/**
 * Build API path for listing rates. Set in `.env` to match PriceLabs docs for your program, e.g.:
 * `PRICELABS_RATES_PATH_TEMPLATE=/open-api/listings/{listingId}/calendar?start_date={from}&end_date={to}`
 *
 * Placeholders: `{listingId}`, `{from}`, `{to}` (yyyy-MM-dd).
 */
function buildRatesPath(
  listingId: string,
  from: string,
  to: string
): string | null {
  const template = process.env.PRICELABS_RATES_PATH_TEMPLATE?.trim();
  if (!template) return null;
  return template
    .replace(/\{listingId\}/g, encodeURIComponent(listingId))
    .replace(/\{from\}/g, encodeURIComponent(from))
    .replace(/\{to\}/g, encodeURIComponent(to));
}

/**
 * Fetch nightly rates from PriceLabs and write `availability.price_override` (+ source pricelabs).
 * Requires `PRICELABS_API_KEY`, `PRICELABS_RATES_PATH_TEMPLATE`, and `properties.pricelabs_listing_id`.
 */
export async function syncPriceLabsRatesForProperty(propertyId: string): Promise<{
  ok: boolean;
  nightsUpdated: number;
  message?: string;
}> {
  if (!isPriceLabsConfigured()) {
    return {
      ok: false,
      nightsUpdated: 0,
      message: "Set PRICELABS_API_KEY in the server environment.",
    };
  }

  const prop = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { pricelabsListingId: true },
  });

  const listingId = prop?.pricelabsListingId?.trim();
  if (!listingId) {
    return {
      ok: false,
      nightsUpdated: 0,
      message: "Add a PriceLabs listing ID for this property in admin.",
    };
  }

  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), 365), "yyyy-MM-dd");

  const path = buildRatesPath(listingId, from, to);
  if (!path) {
    return {
      ok: false,
      nightsUpdated: 0,
      message:
        "Set PRICELABS_RATES_PATH_TEMPLATE in .env to your program’s calendar/rates path (see .env.example).",
    };
  }

  let payload: unknown;
  try {
    payload = await priceLabsJson(path);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      nightsUpdated: 0,
      message: `PriceLabs request failed: ${msg}`,
    };
  }

  const rates = parseRatesFromUnknownPayload(payload);
  if (rates.length === 0) {
    return {
      ok: false,
      nightsUpdated: 0,
      message:
        "No rates parsed from PriceLabs response. Check PRICELABS_RATES_PATH_TEMPLATE and response shape in src/lib/pricelabs/parse-rates.ts.",
    };
  }

  let nightsUpdated = 0;
  for (const { date, price } of rates) {
    await db
      .insert(availability)
      .values({
        propertyId,
        date,
        status: "available",
        priceOverride: String(price),
        source: "pricelabs",
      })
      .onConflictDoUpdate({
        target: [availability.propertyId, availability.date],
        set: {
          priceOverride: String(price),
          source: "pricelabs",
          updatedAt: new Date(),
        },
      });
    nightsUpdated += 1;
  }

  return { ok: true, nightsUpdated };
}

/** Apply pre-parsed rates (e.g. from a PriceLabs webhook). */
export async function upsertPriceLabsNightlyRates(
  propertyId: string,
  rates: { date: string; price: number }[]
): Promise<number> {
  let n = 0;
  for (const { date, price } of rates) {
    await db
      .insert(availability)
      .values({
        propertyId,
        date: date.slice(0, 10),
        status: "available",
        priceOverride: String(price),
        source: "pricelabs",
      })
      .onConflictDoUpdate({
        target: [availability.propertyId, availability.date],
        set: {
          priceOverride: String(price),
          source: "pricelabs",
          updatedAt: new Date(),
        },
      });
    n += 1;
  }
  return n;
}
