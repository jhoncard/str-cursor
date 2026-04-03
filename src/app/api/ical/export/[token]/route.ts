import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings, properties } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { buildPropertyAvailabilityIcs } from "@/lib/ical/export";

export async function GET(
  _request: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  const { token } = await ctx.params;

  const property = await db.query.properties.findFirst({
    where: eq(properties.icalExportToken, token),
    columns: { id: true, name: true },
  });

  if (!property) {
    return new NextResponse("Calendar not found.", { status: 404 });
  }

  const confirmed = await db
    .select({
      id: bookings.id,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      confirmationCode: bookings.confirmationCode,
    })
    .from(bookings)
    .where(
      and(
        eq(bookings.propertyId, property.id),
        eq(bookings.bookingStatus, "confirmed")
      )
    );

  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://localhost";
  const host = (() => {
    try {
      return new URL(base).host;
    } catch {
      return "direct-booking.local";
    }
  })();

  const ics = buildPropertyAvailabilityIcs({
    calendarName: `${property.name} — direct bookings (export)`,
    productIdHost: base,
    events: confirmed.map((b) => ({
      uid: `booking-${b.id}@${host}`,
      summary: `Booked: ${property.name} (${b.confirmationCode})`,
      checkIn: String(b.checkIn),
      checkOut: String(b.checkOut),
    })),
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
