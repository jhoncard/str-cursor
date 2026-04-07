import { db } from '@/lib/db';
import { availability, propertyIcalBlockedDates } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { addDays, format } from 'date-fns';

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

/** Nights occupied for a stay: checkIn .. checkOut (checkOut is exclusive). */
export function eachStayNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  let current = new Date(`${checkIn}T12:00:00Z`);
  const end = new Date(`${checkOut}T12:00:00Z`);

  while (current < end) {
    nights.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }
  return nights;
}

export async function getBlockedDates(
  propertyId: string,
  startDate: Date,
  endDate: Date,
): Promise<Date[]> {
  // Some local/demo property records still use ids like "prop-1".
  // DB availability tables are UUID-based; avoid crashing on invalid UUID input.
  if (!isUuid(propertyId)) {
    return [];
  }

  const start = format(startDate, 'yyyy-MM-dd');
  const end = format(endDate, 'yyyy-MM-dd');

  const [availRows, icalRows] = await Promise.all([
    db
      .select({ date: availability.date })
      .from(availability)
      .where(
        and(
          eq(availability.propertyId, propertyId),
          inArray(availability.status, ['blocked', 'booked']),
          gte(availability.date, start),
          lte(availability.date, end),
        ),
      ),
    db
      .select({ date: propertyIcalBlockedDates.blockedDate })
      .from(propertyIcalBlockedDates)
      .where(
        and(
          eq(propertyIcalBlockedDates.propertyId, propertyId),
          gte(propertyIcalBlockedDates.blockedDate, start),
          lte(propertyIcalBlockedDates.blockedDate, end),
        ),
      ),
  ]);

  const unique = new Set<string>();
  for (const r of availRows) unique.add(String(r.date));
  for (const r of icalRows) unique.add(String(r.date));

  return [...unique].map((d) => new Date(`${d}T12:00:00Z`));
}

/** True if every night in [checkIn, checkOut) is free. */
export async function isStayAvailable(
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  // Without a DB UUID we cannot look up persisted availability rows.
  if (!isUuid(propertyId)) {
    return true;
  }

  const nights = eachStayNight(checkIn, checkOut);
  if (nights.length === 0) return false;

  const [availRows, icalRows] = await Promise.all([
    db
      .select({ date: availability.date })
      .from(availability)
      .where(
        and(
          eq(availability.propertyId, propertyId),
          inArray(availability.date, nights),
          inArray(availability.status, ['booked', 'blocked']),
        ),
      ),
    db
      .select({ date: propertyIcalBlockedDates.blockedDate })
      .from(propertyIcalBlockedDates)
      .where(
        and(
          eq(propertyIcalBlockedDates.propertyId, propertyId),
          inArray(propertyIcalBlockedDates.blockedDate, nights),
        ),
      ),
  ]);

  return availRows.length === 0 && icalRows.length === 0;
}
