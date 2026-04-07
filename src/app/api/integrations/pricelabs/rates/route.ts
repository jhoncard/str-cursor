import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

import { parseRatesFromUnknownPayload } from "@/lib/pricelabs/parse-rates";
import { upsertPriceLabsNightlyRates } from "@/lib/pricelabs/sync-rates";

/**
 * Constant-time bearer-token comparison to avoid leaking the secret via
 * response-time differences. See security audit Finding #5 (CWE-208).
 */
function bearerTokenMatches(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Inbound nightly rates from PriceLabs (or a middleware you control).
 * Secure with `PRICELABS_WEBHOOK_SECRET`: send header `Authorization: Bearer <secret>`.
 *
 * Example body:
 * `{ "listing_id": "YOUR_PL_LISTING_ID", "rates": [ { "date": "2026-06-01", "price": 199 }] }`
 * (Any JSON shape supported by `parseRatesFromUnknownPayload` also works.)
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PRICELABS_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "PRICELABS_WEBHOOK_SECRET is not configured." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  if (!bearerTokenMatches(token, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const listingId =
    (typeof obj?.listing_id === "string" && obj.listing_id) ||
    (typeof obj?.listingId === "string" && obj.listingId) ||
    null;

  if (!listingId?.trim()) {
    return NextResponse.json(
      { error: "Missing listing_id (or listingId)." },
      { status: 400 }
    );
  }

  const property = await db.query.properties.findFirst({
    where: eq(properties.pricelabsListingId, listingId.trim()),
    columns: { id: true },
  });

  if (!property) {
    return NextResponse.json(
      { error: "No property matches this PriceLabs listing ID." },
      { status: 404 }
    );
  }

  const rates = parseRatesFromUnknownPayload(
    obj?.rates ?? obj?.data ?? body
  );
  if (rates.length === 0) {
    return NextResponse.json(
      { error: "No rates could be parsed from the payload." },
      { status: 400 }
    );
  }

  const updated = await upsertPriceLabsNightlyRates(property.id, rates);

  return NextResponse.json({ ok: true, nightsUpdated: updated });
}
