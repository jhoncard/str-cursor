import "server-only";

import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { BookingConfirmationEmail } from "@/lib/email/templates/booking-confirmation";
import { HostNotificationEmail } from "@/lib/email/templates/host-notification";
import { provisionSeamAccessCodeForBooking } from "@/lib/seam/provision-booking";
import { reservePaidBooking, type PaidBooking } from "./reserve";

// Not a Server Action: only the signature-verified webhook can finalize payments.
export async function finalizeBookingFromStripe(payload: PaidBooking) {
  const newBooking = await reservePaidBooking(db, payload);
  if (newBooking.alreadyExists) return newBooking;

  // Fulfillment happens after commit. A provider failure cannot undo a paid
  // reservation or cause duplicate bookings. See the recovery runbook.
  let seam: { doorCode: string | null } = { doorCode: null };
  try {
    seam = await provisionSeamAccessCodeForBooking(newBooking.id);
  } catch {
    console.error("booking_fulfillment_failed", { bookingId: newBooking.id, step: "seam" });
  }
  try {
    const hostEmail = process.env.HOST_EMAIL ?? "host@feathershouses.com";
    const propertyName = newBooking.propertyName;

    const delivery = await Promise.allSettled([
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
          doorCode: seam.doorCode ?? undefined,
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
          doorCode: seam.doorCode ?? undefined,
        }),
      }),
    ]);
    delivery.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error("booking_fulfillment_failed", {
          bookingId: newBooking.id, step: index === 0 ? "guest_email" : "host_email",
        });
      }
    });
  } catch {
    console.error("booking_fulfillment_failed", { bookingId: newBooking.id, step: "email_template" });
  }

  return newBooking;
}
