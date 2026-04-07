import { db } from "@/lib/db";
import { availability, properties } from "@/lib/db/schema";
import { eachStayNight } from "@/lib/availability";
import { and, eq, inArray } from "drizzle-orm";

export type NightlyRate = { date: string; amount: number };

/**
 * Computes accommodation subtotal for a stay using `properties.base_price_night`
 * and per-night `availability.price_override` when present (e.g. from PriceLabs sync).
 */
export async function computeStayAccommodationSubtotal(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  options?: { fallbackBasePriceNight?: number }
): Promise<{
  nights: number;
  nightly: NightlyRate[];
  subtotal: number;
  basePriceNight: number;
}> {
  const prop = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { basePriceNight: true },
  });
  if (!prop) {
    throw new Error("Property not found.");
  }

  let base = Number(prop.basePriceNight);
  if ((!Number.isFinite(base) || base <= 0) && options?.fallbackBasePriceNight) {
    const fallback = Number(options.fallbackBasePriceNight);
    if (Number.isFinite(fallback) && fallback > 0) {
      base = fallback;
    }
  }
  if (!Number.isFinite(base) || base < 0) {
    throw new Error("Invalid base price for property.");
  }

  const nightDates = eachStayNight(checkIn, checkOut);
  if (nightDates.length === 0) {
    return { nights: 0, nightly: [], subtotal: 0, basePriceNight: base };
  }

  const rows = await db
    .select({
      date: availability.date,
      priceOverride: availability.priceOverride,
    })
    .from(availability)
    .where(
      and(
        eq(availability.propertyId, propertyId),
        inArray(availability.date, nightDates)
      )
    );

  const overrideByDate = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.date);
    if (r.priceOverride != null && String(r.priceOverride).trim() !== "") {
      const n = Number(r.priceOverride);
      if (Number.isFinite(n) && n >= 0) {
        overrideByDate.set(d, n);
      }
    }
  }

  const nightly: NightlyRate[] = nightDates.map((date) => ({
    date,
    amount: overrideByDate.has(date) ? overrideByDate.get(date)! : base,
  }));

  const subtotal = nightly.reduce((sum, n) => sum + n.amount, 0);

  return {
    nights: nightDates.length,
    nightly,
    subtotal,
    basePriceNight: base,
  };
}
