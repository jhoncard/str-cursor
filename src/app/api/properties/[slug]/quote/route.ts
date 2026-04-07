import { NextRequest, NextResponse } from "next/server";

import { propertiesData } from "@/data/properties";
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

  if (!checkIn || !checkOut) {
    return NextResponse.json(
      { error: "checkIn and checkOut are required (yyyy-MM-dd)." },
      { status: 400 }
    );
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
      checkIn,
      checkOut,
      { fallbackBasePriceNight: staticProp.basePriceNight }
    );
    const cleaningFee = Number(row.cleaningFee ?? staticProp.cleaningFee ?? 0);
    const serviceFee = staticProp.serviceFee;
    const total = acc.subtotal + cleaningFee + serviceFee;

    return NextResponse.json({
      slug,
      checkIn,
      checkOut,
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
    const msg = e instanceof Error ? e.message : "Could not compute quote.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
