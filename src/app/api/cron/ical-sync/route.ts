import { NextResponse } from 'next/server';
import { syncAllFeeds } from '@/lib/ical/sync';

function assertCronAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${secret}`;
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
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json(await runSync());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
