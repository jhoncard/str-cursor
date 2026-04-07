import "server-only";

import { addDays, format } from "date-fns";
import { db } from "@/lib/db";
import { availability, properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { isPriceLabsConfigured } from "./config";
import { fetchListingRatesUncached, type ListingDailyRate } from "./listing-rates";

/**
 * Fetch nightly rates from PriceLabs Customer API (`POST /v1/listing_prices`) and write
 * `availability.price_override` (+ source pricelabs).
 * Requires `PRICELABS_API_KEY`, `properties.pricelabs_listing_id`, and optional `PRICELABS_PMS` (default airbnb).
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

  let daily: ListingDailyRate[];
  try {
    daily = await fetchListingRatesUncached(listingId, from, to);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      nightsUpdated: 0,
      message: `PriceLabs request failed: ${msg}`,
    };
  }

  if (daily.length === 0) {
    return {
      ok: false,
      nightsUpdated: 0,
      message:
        "No nightly rates returned from PriceLabs. Confirm sync is ON for this listing and PRICELABS_PMS matches the listing (see .env.example).",
    };
  }

  let nightsUpdated = 0;
  for (const { date, price, available } of daily) {
    await db
      .insert(availability)
      .values({
        propertyId,
        date,
        status: available ? "available" : "blocked",
        priceOverride: String(price),
        source: "pricelabs",
      })
      .onConflictDoUpdate({
        target: [availability.propertyId, availability.date],
        set: {
          priceOverride: String(price),
          status: available ? "available" : "blocked",
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
