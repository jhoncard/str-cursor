import "server-only";

import { createHash } from "node:crypto";
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";
import { eachStayNight } from "@/lib/stay-dates";

const { bookings, guests, properties, availability, propertyIcalBlockedDates } = schema;

export interface PaidBooking {
  paymentIntentId: string;
  propertySlug: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  totalAmount: number;
  nightlyRate: number;
  cleaningFee: number;
  contractAcceptedAt?: string;
}

export class ReservationConflict extends Error {}

/** Only call after verifying Stripe's signature AND a paid payment-mode session. */
export async function reservePaidBooking(database: PostgresJsDatabase<typeof schema>, payload: PaidBooking) {
  const nights = eachStayNight(payload.checkIn, payload.checkOut);
  if (!nights.length || !/^pi_[a-zA-Z0-9]+$/.test(payload.paymentIntentId) ||
      !Number.isInteger(payload.numGuests) || payload.numGuests < 1 ||
      !payload.firstName.trim() || !payload.lastName.trim() || !payload.email.trim() ||
      [payload.totalAmount, payload.nightlyRate, payload.cleaningFee].some(n => !Number.isFinite(n) || n < 0) ||
      (payload.contractAcceptedAt && !Number.isFinite(Date.parse(payload.contractAcceptedAt)))) {
    throw new Error("Invalid paid booking details.");
  }

  return database.transaction(async (tx) => {
    // Transaction-scoped locks work across server instances. Take payment first,
    // then property, consistently. Recheck after waiting (READ COMMITTED).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${payload.paymentIntentId}, 0))`);
    const [existing] = await tx.select({
      id: bookings.id, confirmationCode: bookings.confirmationCode,
    }).from(bookings).where(eq(bookings.paymentIntentId, payload.paymentIntentId)).limit(1);
    if (existing) return { ...existing, alreadyExists: true, propertyName: "" };

    const [property] = await tx.select({
      id: properties.id, name: properties.name, maxGuests: properties.maxGuests,
      status: properties.status, guestContractPdfUrl: properties.guestContractPdfUrl,
    }).from(properties).where(eq(properties.slug, payload.propertySlug)).for("update");
    if (!property || property.status !== "active") throw new ReservationConflict("Property unavailable.");
    if (payload.numGuests > property.maxGuests) throw new ReservationConflict("Guest count exceeds capacity.");

    const [overlap] = await tx.select({ id: bookings.id }).from(bookings).where(and(
      eq(bookings.propertyId, property.id), ne(bookings.bookingStatus, "cancelled"),
      lt(bookings.checkIn, payload.checkOut), gt(bookings.checkOut, payload.checkIn),
    )).limit(1);
    const [blocked] = await tx.select({ date: availability.date }).from(availability).where(and(
      eq(availability.propertyId, property.id), inArray(availability.date, nights),
      inArray(availability.status, ["booked", "blocked"]),
    )).limit(1);
    const [external] = await tx.select({ date: propertyIcalBlockedDates.blockedDate })
      .from(propertyIcalBlockedDates).where(and(
        eq(propertyIcalBlockedDates.propertyId, property.id),
        inArray(propertyIcalBlockedDates.blockedDate, nights),
      )).limit(1);
    if (overlap || blocked || external) throw new ReservationConflict("Dates are no longer available.");

    // Different properties can receive simultaneous bookings by the same guest.
    // Do not overwrite an existing guest's profile with checkout metadata.
    await tx.insert(guests).values({
      firstName: payload.firstName, lastName: payload.lastName,
      email: payload.email.trim().toLowerCase(), phone: payload.phone ?? null,
    }).onConflictDoNothing({ target: guests.email });
    const [guest] = await tx.select({ id: guests.id }).from(guests)
      .where(eq(guests.email, payload.email.trim().toLowerCase()));

    const [booking] = await tx.insert(bookings).values({
      confirmationCode: `BK-${createHash("sha256").update(payload.paymentIntentId).digest("hex").slice(0, 20).toUpperCase()}`,
      paymentIntentId: payload.paymentIntentId, propertyId: property.id, guestId: guest.id,
      checkIn: payload.checkIn, checkOut: payload.checkOut, numGuests: payload.numGuests,
      nightlyRate: String(payload.nightlyRate), cleaningFee: String(payload.cleaningFee),
      totalAmount: String(payload.totalAmount), paymentStatus: "paid", bookingStatus: "confirmed", source: "direct",
      contractAcceptedAt: payload.contractAcceptedAt ? new Date(payload.contractAcceptedAt) : null,
      contractTextSnapshot: payload.contractAcceptedAt ? property.guestContractPdfUrl : null,
    }).returning({ id: bookings.id, confirmationCode: bookings.confirmationCode });

    // Also supports databases without the legacy AFTER INSERT blocking trigger.
    // Both the reservation and every night roll back if any write fails.
    await tx.insert(availability).values(nights.map(date => ({
      propertyId: property.id, date, status: "booked" as const, source: "direct" as const,
    }))).onConflictDoUpdate({
      target: [availability.propertyId, availability.date],
      set: { status: "booked", source: "direct", updatedAt: new Date() },
    });
    return { ...booking, alreadyExists: false, propertyName: property.name };
  }, { isolationLevel: "read committed" });
}
