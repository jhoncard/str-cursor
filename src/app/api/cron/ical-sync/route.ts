import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { syncAllFeeds } from '@/lib/ical/sync';

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return false;
  // Security: constant-time comparison to avoid leaking the secret one byte
  // at a time via response timing. See security audit Finding #5 (CWE-208).
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  const actual = Buffer.from(authHeader, 'utf8');
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

async function runSync() {
  const results = await syncAllFeeds();
  const synced = results.filter((r) => !r.error).length;
  const errors = results.filter((r) => r.error);
  return {
    synced,
    totalFeeds: results.length,
    totalDatesBlocked: results.reduce((sum, r) => sum + r.count, 0),
    errors: errors.length > 0 ? errors : undefined,
  };
}

/** Vercel Cron invokes GET by default. */
export async function GET(request: Request) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    console.error("[cron/ical-sync] failed:", err);
    return NextResponse.json({ error: "iCal sync failed." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    console.error("[cron/ical-sync] failed:", err);
    return NextResponse.json({ error: "iCal sync failed." }, { status: 500 });
  }
}
