import { NextResponse } from 'next/server';
import { syncAllFeeds } from '@/lib/ical/sync';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await syncAllFeeds();

    const synced = results.filter((r) => !r.error).length;
    const errors = results.filter((r) => r.error);

    return NextResponse.json({
      synced,
      totalFeeds: results.length,
      totalDatesBlocked: results.reduce((sum, r) => sum + r.count, 0),
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
