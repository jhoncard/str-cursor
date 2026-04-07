import "server-only";

import { eachDayOfInterval, format } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";

import { db } from "@/lib/db";
import { availability, properties } from "@/lib/db/schema";

/**
 * Map yyyy-MM-dd → nightly rate for the guest calendar (base + PriceLabs overrides).
 */
export async function getNightlyPriceMapForCalendar(
  propertyId: string,
  rangeStart: Date,
  rangeEnd: Date,
  fallbackBasePriceNight: number
): Promise<Record<string, number>> {
  const prop = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { basePriceNight: true },
  });

  let base = prop ? Number(prop.basePriceNight) : NaN;
  // Treat 0 / invalid DB values as missing so the UI matches static marketing rates when DB wasn't filled in.
  if (!Number.isFinite(base) || base <= 0) {
    base = fallbackBasePriceNight;
  }

  const from = format(rangeStart, "yyyy-MM-dd");
  const to = format(rangeEnd, "yyyy-MM-dd");

  const rows = await db
    .select({
      date: availability.date,
      priceOverride: availability.priceOverride,
    })
    .from(availability)
    .where(
      and(
        eq(availability.propertyId, propertyId),
        gte(availability.date, from),
        lte(availability.date, to)
      )
    );

  const overrideByDate = new Map<string, number>();
  for (const r of rows) {
    const d = String(r.date);
    if (r.priceOverride != null && String(r.priceOverride).trim() !== "") {
      const n = Number(r.priceOverride);
      // Ignore 0 so bad sync rows don't wipe the night rate; use base for that date instead.
      if (Number.isFinite(n) && n > 0) {
        overrideByDate.set(d, n);
      }
    }
  }

  const out: Record<string, number> = {};
  for (const day of eachDayOfInterval({ start: rangeStart, end: rangeEnd })) {
    const key = format(day, "yyyy-MM-dd");
    out[key] = overrideByDate.has(key) ? overrideByDate.get(key)! : base;
  }
  return out;
}
