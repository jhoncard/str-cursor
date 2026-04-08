import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import {
  assertWithinLimit,
  checkoutLimiter,
  clientIpFromHeaders,
} from "@/lib/ratelimit";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/properties/[slug]/quote?checkIn=yyyy-MM-dd&checkOut=yyyy-MM-dd
 * Returns accommodation subtotal using base price + per-night overrides (e.g. PriceLabs).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const checkIn = request.nextUrl.searchParams.get("checkIn");
  const checkOut = request.nextUrl.searchParams.get("checkOut");

  const ip = clientIpFromHeaders(request.headers);
  const lim = await assertWithinLimit(checkoutLimiter, `quote:${ip}`);
  if (!lim.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const QuoteSchema = z.object({
    checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });
  const parsed = QuoteSchema.safeParse({ checkIn, checkOut });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dates." }, { status: 400 });
  }

  const staticProp = propertiesData.find((p) => p.slug === slug);
  if (!staticProp) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const row = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    columns: { id: true, cleaningFee: true },
  });

  if (!row?.id) {
    return NextResponse.json(
      { error: "Property is not available for booking in the database." },
      { status: 404 }
    );
  }

  try {
    const acc = await computeStayAccommodationSubtotal(
      row.id,
      parsed.data.checkIn,
      parsed.data.checkOut,
      { fallbackBasePriceNight: staticProp.basePriceNight }
    );
    const cleaningFee = Number(row.cleaningFee ?? staticProp.cleaningFee ?? 0);
    const serviceFee = staticProp.serviceFee;
    const total = acc.subtotal + cleaningFee + serviceFee;

    return NextResponse.json({
      slug,
      checkIn: parsed.data.checkIn,
      checkOut: parsed.data.checkOut,
      nights: acc.nights,
      nightly: acc.nightly,
      basePriceNight: acc.basePriceNight,
      accommodationSubtotal: acc.subtotal,
      cleaningFee,
      serviceFee,
      total,
      currency: "usd",
    });
  } catch (e) {
    console.error("[quote] compute failed:", e);
    return NextResponse.json(
      { error: "Could not compute quote." },
      { status: 400 },
    );
  }
}
