import { NextRequest, NextResponse } from "next/server";
import { SeamWebhook } from "seam";

/**
 * Receives lock events from Seam. Configure in Seam Console → Developer →
 * Webhooks with a URL like https://your-domain/api/seam/webhook and copy
 * the signing secret into SEAM_WEBHOOK_SECRET.
 *
 * Docs: https://docs.seam.co/latest/developer-tools/webhooks
 * Refs: feature doc Task 8
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "SEAM_WEBHOOK_SECRET is not configured." },
      { status: 503 },
    );
  }

  const rawBody = await request.text();

  // Seam signs webhooks with an SVIX-compatible signature. Pass the raw
  // body and headers directly to SeamWebhook.verify().
  const webhook = new SeamWebhook(secret);
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  let event: unknown;
  try {
    event = webhook.verify(rawBody, headers);
  } catch (e) {
    console.error(
      "[seam webhook] signature verification failed:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  // Log for now. The next phase of this feature would write events to a
  // seam_events table keyed by booking and surface them in the admin UI.
  console.log(
    "[seam webhook] verified event:",
    JSON.stringify(event).slice(0, 500),
  );

  return NextResponse.json({ received: true });
}
