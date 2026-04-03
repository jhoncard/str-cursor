import "server-only";

import { db } from '@/lib/db';
import { propertyIcalFeeds, propertyIcalBlockedDates } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addDays, format } from 'date-fns';

function unfoldIcsLines(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, '')
    .replace(/\n[ \t]/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim());
}

function parseIcsDate(raw: string): Date | null {
  const value = raw.trim();

  // All-day date: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, m - 1, d));
  }

  // UTC datetime: YYYYMMDDTHHMMSSZ
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }

  // Floating datetime (no timezone): treat as UTC for blocking nights.
  if (/^\d{8}T\d{6}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }

  return null;
}

function parseEventDateValue(line: string): Date | null {
  const idx = line.indexOf(':');
  if (idx < 0) return null;
  return parseIcsDate(line.slice(idx + 1));
}

function extractBlockedNightsFromIcs(ics: string): string[] {
  const lines = unfoldIcsLines(ics);
  const blocked: string[] = [];

  let inEvent = false;
  let start: Date | null = null;
  let end: Date | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      start = null;
      end = null;
      continue;
    }

    if (line === 'END:VEVENT') {
      if (inEvent && start && end) {
        blocked.push(...eachNightInStay(start, end));
      }
      inEvent = false;
      start = null;
      end = null;
      continue;
    }

    if (!inEvent) continue;

    if (line.startsWith('DTSTART')) {
      start = parseEventDateValue(line);
    } else if (line.startsWith('DTEND')) {
      end = parseEventDateValue(line);
    }
  }

  return blocked;
}

function eachNightInStay(checkIn: Date, checkOut: Date): string[] {
  const dates: string[] = [];
  let current = new Date(checkIn);
  const end = new Date(checkOut);

  current.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (current < end) {
    dates.push(format(current, 'yyyy-MM-dd'));
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Replaces blocked nights for this feed only (supports multiple calendars per property).
 */
export async function syncIcalFeed(
  feedId: string,
  propertyId: string,
  feedUrl: string,
) {
  const response = await fetch(feedUrl, {
    headers: { 'user-agent': 'FeathersHousesIcalSync/1.0' },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Could not fetch iCal feed (${response.status}).`);
  }
  const ics = await response.text();
  const blockedDates = extractBlockedNightsFromIcs(ics);
  const uniqueDates = [...new Set(blockedDates)];

  await db
    .delete(propertyIcalBlockedDates)
    .where(eq(propertyIcalBlockedDates.icalFeedId, feedId));

  if (uniqueDates.length === 0) return 0;

  const BATCH_SIZE = 500;
  for (let i = 0; i < uniqueDates.length; i += BATCH_SIZE) {
    const batch = uniqueDates.slice(i, i + BATCH_SIZE);
    await db.insert(propertyIcalBlockedDates).values(
      batch.map((d) => ({
        icalFeedId: feedId,
        propertyId,
        blockedDate: d,
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
      const count = await syncIcalFeed(feed.id, feed.propertyId, feed.feedUrl);

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
