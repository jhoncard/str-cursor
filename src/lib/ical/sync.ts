import { db } from '@/lib/db';
import { availability, propertyIcalFeeds, type bookingSourceEnum } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { addDays, format } from 'date-fns';

type BookingSource = (typeof bookingSourceEnum.enumValues)[number];

const SOURCE_MAP: Record<string, BookingSource> = {
  airbnb: 'airbnb',
  vrbo: 'vrbo',
  'booking.com': 'booking_com',
  booking_com: 'booking_com',
};

function resolveSource(feedSource: string): BookingSource {
  return SOURCE_MAP[feedSource.toLowerCase()] ?? 'manual';
}

function eachDayInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  let current = new Date(start);
  const endDate = new Date(end);

  current.setUTCHours(0, 0, 0, 0);
  endDate.setUTCHours(0, 0, 0, 0);

  while (current < endDate) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }
  return dates;
}

export async function syncIcalFeed(feedUrl: string, propertyId: string, feedSource: string) {
  const nodeIcal = await import('node-ical');
  const data = await nodeIcal.async.fromURL(feedUrl);
  const source = resolveSource(feedSource);
  const blockedDates: string[] = [];

  for (const key of Object.keys(data)) {
    const component = data[key];
    if (!component || component.type !== 'VEVENT') continue;

    if (!component.start || !component.end) continue;

    const dates = eachDayInRange(component.start, component.end);
    blockedDates.push(...dates);
  }

  const uniqueDates = [...new Set(blockedDates)];

  await db
    .delete(availability)
    .where(
      and(
        eq(availability.propertyId, propertyId),
        eq(availability.source, source),
        eq(availability.status, 'blocked'),
      ),
    );

  if (uniqueDates.length === 0) return 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < uniqueDates.length; i += BATCH_SIZE) {
    const batch = uniqueDates.slice(i, i + BATCH_SIZE);
    await db.insert(availability).values(
      batch.map((d) => ({
        propertyId,
        date: d,
        status: 'blocked' as const,
        source,
      })),
    );
  }

  return uniqueDates.length;
}

export async function syncAllFeeds() {
  const feeds = await db.select().from(propertyIcalFeeds);

  const results: { feedId: string; count: number; error?: string }[] = [];

  for (const feed of feeds) {
    try {
      const count = await syncIcalFeed(feed.feedUrl, feed.propertyId, feed.source);

      await db
        .update(propertyIcalFeeds)
        .set({ lastSyncAt: new Date() })
        .where(eq(propertyIcalFeeds.id, feed.id));

      results.push({ feedId: feed.id, count });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ feedId: feed.id, count: 0, error: message });
    }
  }

  return results;
}
