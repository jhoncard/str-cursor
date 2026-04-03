"use server";

import { db } from "@/lib/db";
import { bookings, guests, availability, properties } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { propertiesData } from "@/data/properties";
import { sendEmail } from "@/lib/email";
import { BookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";
import { HostNotificationEmail } from "@/lib/email/templates/host-notification";

interface BookingData {
  propertyId: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  totalAmount: number;
  nightlyRate: number;
}

function generateConfirmationCode(seed?: string) {
  if (seed) {
    const normalized = seed.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return `BK-${normalized.slice(-10)}`;
  }
  return `BK-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
}

export async function createBooking(data: BookingData) {
  try {
    const property = propertiesData.find((item) => item.id === data.propertyId);
    if (!property) {
      return { success: false, error: "Property not found." };
    }

    if (data.numGuests < 1 || data.numGuests > property.maxGuests) {
      return { success: false, error: `Guest count must be between 1 and ${property.maxGuests} for this property.` };
    }

    // 1. Check availability
    const existingBookings = await db.query.availability.findMany({
      where: and(
        eq(availability.propertyId, data.propertyId),
        gte(availability.date, data.checkIn),
        lte(availability.date, data.checkOut),
        eq(availability.status, 'booked')
      )
    });

    if (existingBookings.length > 0) {
      return { success: false, error: "Dates are no longer available." };
    }

    // 2. Find or create guest
    let guestId: string;
    const existingGuest = await db.query.guests.findFirst({
      where: eq(guests.email, data.email)
    });

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const [newGuest] = await db.insert(guests).values({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      }).returning({ id: guests.id });
      guestId = newGuest.id;
    }

    // 3. Create Booking
    const [newBooking] = await db.insert(bookings).values({
      confirmationCode: `BK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      propertyId: data.propertyId,
      guestId,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      numGuests: data.numGuests,
      nightlyRate: data.nightlyRate.toString(),
      cleaningFee: "0",
      petFee: "0",
      addOnsTotal: "0",
      taxes: "0",
      totalAmount: data.totalAmount.toString(),
      paymentStatus: 'paid', // Mocked
      bookingStatus: 'confirmed',
      source: 'direct',
    }).returning({ id: bookings.id, confirmationCode: bookings.confirmationCode });

    // 4. Update Availability
    // (Ideally we would insert rows for each date between checkIn and checkOut as 'booked')
    // For MVP, we simply insert a record for the checkIn date to block it
    await db.insert(availability).values({
      propertyId: data.propertyId,
      date: data.checkIn,
      status: 'booked',
      source: 'direct',
    });

    return { success: true, bookingId: newBooking.id, confirmationCode: newBooking.confirmationCode };
  } catch (error) {
    console.error("Booking error:", error);
    return { success: false, error: "Failed to process booking." };
  }
}

interface FinalizeStripeBookingPayload {
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
}

export async function finalizeBookingFromStripe(payload: FinalizeStripeBookingPayload) {
  try {
    const existingByPaymentIntent = await db.query.bookings.findFirst({
      where: eq(bookings.paymentIntentId, payload.paymentIntentId),
    });
    if (existingByPaymentIntent) {
      return { success: true, confirmationCode: existingByPaymentIntent.confirmationCode, alreadyExists: true };
    }

    const dbProperty = await db.query.properties.findFirst({
      where: eq(properties.slug, payload.propertySlug),
      columns: { id: true, name: true, maxGuests: true },
    });

    if (!dbProperty) {
      return { success: false, error: "Property not found for Stripe session." };
    }

    if (payload.numGuests < 1 || payload.numGuests > dbProperty.maxGuests) {
      return { success: false, error: `Guest count must be between 1 and ${dbProperty.maxGuests}.` };
    }

    const existingBookings = await db.query.availability.findMany({
      where: and(
        eq(availability.propertyId, dbProperty.id),
        gte(availability.date, payload.checkIn),
        lte(availability.date, payload.checkOut),
        eq(availability.status, "booked")
      ),
    });

    if (existingBookings.length > 0) {
      return { success: false, error: "Dates are no longer available." };
    }

    let guestId: string;
    const existingGuest = await db.query.guests.findFirst({
      where: eq(guests.email, payload.email),
      columns: { id: true },
    });

    if (existingGuest) {
      guestId = existingGuest.id;
    } else {
      const [newGuest] = await db
        .insert(guests)
        .values({
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          phone: payload.phone ?? null,
        })
        .returning({ id: guests.id });
      guestId = newGuest.id;
    }

    const confirmationCode = generateConfirmationCode(payload.paymentIntentId);
    const [newBooking] = await db
      .insert(bookings)
      .values({
        confirmationCode,
        paymentIntentId: payload.paymentIntentId,
        propertyId: dbProperty.id,
        guestId,
        checkIn: payload.checkIn,
        checkOut: payload.checkOut,
        numGuests: payload.numGuests,
        nightlyRate: payload.nightlyRate.toString(),
        cleaningFee: payload.cleaningFee.toString(),
        petFee: "0",
        addOnsTotal: "0",
        taxes: "0",
        totalAmount: payload.totalAmount.toString(),
        paymentStatus: "paid",
        bookingStatus: "confirmed",
        source: "direct",
      })
      .returning({ id: bookings.id, confirmationCode: bookings.confirmationCode });

    await db
      .insert(availability)
      .values({
        propertyId: dbProperty.id,
        date: payload.checkIn,
        status: "booked",
        source: "direct",
      })
      .onConflictDoUpdate({
        target: [availability.propertyId, availability.date],
        set: {
          status: "booked",
          source: "direct",
          updatedAt: new Date(),
        },
      });

    try {
      const hostEmail = process.env.HOST_EMAIL ?? "host@feathershouses.com";
      const propertyName = dbProperty.name;

      await Promise.all([
        sendEmail({
          to: payload.email,
          subject: `Booking Confirmed - ${propertyName} (${newBooking.confirmationCode})`,
          body: BookingConfirmationEmail({
            guestFirstName: payload.firstName,
            propertyName,
            checkIn: payload.checkIn,
            checkOut: payload.checkOut,
            confirmationCode: newBooking.confirmationCode,
            totalAmount: payload.totalAmount.toFixed(2),
          }),
        }),
        sendEmail({
          to: hostEmail,
          subject: `New Booking: ${propertyName} - ${newBooking.confirmationCode}`,
          body: HostNotificationEmail({
            guestName: `${payload.firstName} ${payload.lastName}`,
            guestEmail: payload.email,
            guestPhone: payload.phone,
            propertyName,
            checkIn: payload.checkIn,
            checkOut: payload.checkOut,
            numGuests: payload.numGuests,
            totalAmount: payload.totalAmount.toFixed(2),
            confirmationCode: newBooking.confirmationCode,
          }),
        }),
      ]);
    } catch (emailError) {
      console.error("Failed to send booking emails:", emailError);
    }

    return { success: true, bookingId: newBooking.id, confirmationCode: newBooking.confirmationCode, alreadyExists: false };
  } catch (error) {
    console.error("Stripe booking finalization error:", error);
    return { success: false, error: "Failed to finalize Stripe booking." };
  }
}
