import { db } from '@/lib/db';
import { availability } from '@/lib/db/schema';
import { eq, and, gte, lte, inArray } from 'drizzle-orm';
import { format } from 'date-fns';

export async function getBlockedDates(
  propertyId: string,
  startDate: Date,
  endDate: Date,
): Promise<Date[]> {
  const rows = await db
    .select({ date: availability.date })
    .from(availability)
    .where(
      and(
        eq(availability.propertyId, propertyId),
        inArray(availability.status, ['blocked', 'booked']),
        gte(availability.date, format(startDate, 'yyyy-MM-dd')),
        lte(availability.date, format(endDate, 'yyyy-MM-dd')),
      ),
    );

  return rows.map((row) => new Date(row.date));
}
