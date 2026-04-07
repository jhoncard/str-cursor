import "server-only";

import { count, desc, eq, isNotNull, sum } from "drizzle-orm";

import { db } from "@/lib/db";
import { bookings, guests, properties } from "@/lib/db/schema";

/** Admin list — uses Drizzle + DATABASE_URL so RLS on Supabase does not hide rows. */
export async function listBookingsForAdmin() {
  return db
    .select({
      id: bookings.id,
      confirmationCode: bookings.confirmationCode,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      numGuests: bookings.numGuests,
      totalAmount: bookings.totalAmount,
      paymentStatus: bookings.paymentStatus,
      bookingStatus: bookings.bookingStatus,
      createdAt: bookings.createdAt,
      guestFirstName: guests.firstName,
      guestLastName: guests.lastName,
      guestEmail: guests.email,
      guestPhone: guests.phone,
      propertyName: properties.name,
      propertySlug: properties.slug,
    })
    .from(bookings)
    .innerJoin(guests, eq(bookings.guestId, guests.id))
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .orderBy(desc(bookings.createdAt));
}

export async function getAdminDashboardStats() {
  const [bookingCountRes, paidRes, activeRes, guestRes] = await Promise.all([
    db.select({ bookingCount: count() }).from(bookings),
    db
      .select({ paidRevenue: sum(bookings.totalAmount) })
      .from(bookings)
      .where(eq(bookings.paymentStatus, "paid")),
    db
      .select({ activeProperties: count() })
      .from(properties)
      .where(eq(properties.status, "active")),
    db.select({ guestCount: count() }).from(guests),
  ]);

  const revenue = Number(paidRes[0]?.paidRevenue ?? 0);

  return {
    totalBookings: Number(bookingCountRes[0]?.bookingCount ?? 0),
    totalRevenue: Number.isFinite(revenue) ? revenue : 0,
    activeProperties: Number(activeRes[0]?.activeProperties ?? 0),
    totalGuests: Number(guestRes[0]?.guestCount ?? 0),
  };
}

/** Bookings that have a Stripe payment_intent (for payments page mapping). */
export async function listBookingsWithPaymentIntents() {
  return db
    .select({
      confirmationCode: bookings.confirmationCode,
      paymentIntentId: bookings.paymentIntentId,
      guestEmail: guests.email,
    })
    .from(bookings)
    .innerJoin(guests, eq(bookings.guestId, guests.id))
    .where(isNotNull(bookings.paymentIntentId));
}

/** Guest dashboard — same DB path as inserts (not blocked by Supabase RLS). */
export async function listBookingsForGuestEmail(email: string) {
  const guest = await db.query.guests.findFirst({
    where: eq(guests.email, email.trim()),
    columns: { id: true },
  });
  if (!guest) return [];
  return listBookingsForGuestId(guest.id);
}

async function listBookingsForGuestId(guestId: string) {
  return db
    .select({
      id: bookings.id,
      confirmationCode: bookings.confirmationCode,
      checkIn: bookings.checkIn,
      checkOut: bookings.checkOut,
      numGuests: bookings.numGuests,
      totalAmount: bookings.totalAmount,
      paymentStatus: bookings.paymentStatus,
      bookingStatus: bookings.bookingStatus,
      createdAt: bookings.createdAt,
      propertyName: properties.name,
      propertySlug: properties.slug,
    })
    .from(bookings)
    .innerJoin(properties, eq(bookings.propertyId, properties.id))
    .where(eq(bookings.guestId, guestId))
    .orderBy(desc(bookings.createdAt));
}
