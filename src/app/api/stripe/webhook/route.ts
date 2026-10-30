import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { finalizeBookingFromStripe } from "@/lib/booking/finalize";
import { eachStayNight } from "@/lib/stay-dates";
import { ReservationConflict } from "@/lib/booking/reserve";
import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature header or STRIPE_WEBHOOK_SECRET." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    // Delayed payment methods can complete Checkout before money is received.
    if (session.mode !== "payment" || session.payment_status !== "paid") {
      return NextResponse.json({ received: true });
    }
    const metadata = session.metadata ?? {};
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    const propertySlug = metadata.propertySlug;
    const checkIn = metadata.checkIn;
    const checkOut = metadata.checkOut;
    const firstName = metadata.firstName;
    const lastName = metadata.lastName;
    const email = metadata.email ?? session.customer_details?.email ?? session.customer_email;
    const phone = metadata.phone ?? session.customer_details?.phone ?? undefined;
    const numGuests = Number(metadata.numGuests ?? "0");

    if (!propertySlug || !checkIn || !checkOut || !firstName || !lastName || !email || !paymentIntentId) {
      return NextResponse.json({ error: "Missing required session metadata." }, { status: 400 });
    }

    const property = propertiesData.find((item) => item.slug === propertySlug);
    if (!property) {
      return NextResponse.json({ error: "Property metadata is invalid." }, { status: 400 });
    }

    const amountTotal = (session.amount_total ?? 0) / 100;
    const nights = eachStayNight(checkIn, checkOut).length;
    if (!nights || session.amount_total == null || session.currency !== "usd") {
      return NextResponse.json({ error: "Invalid paid session details." }, { status: 400 });
    }
    // Use the server-created quote snapshot; fall back only for older sessions.
    const nightlyRate = metadata.accommodationSubtotal !== undefined
      ? Number(metadata.accommodationSubtotal) / nights : property.basePriceNight;

    const contractAcceptedAt =
      typeof metadata.contractAcceptedAt === "string"
        ? metadata.contractAcceptedAt
        : undefined;

    try {
      // Events are historical snapshots. A host may already have refunded a
      // paid-but-unavailable stay before Stripe retries this old event.
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
      const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
      if (charge && (charge.refunded || charge.amount_refunded > 0)) {
        console.info("booking_payment_already_refunded", { eventId: event.id, paymentIntentId });
        return NextResponse.json({ received: true });
      }
      if (intent.status !== "succeeded" || !charge || intent.currency !== session.currency ||
          intent.amount_received < session.amount_total) {
        throw new Error("Payment is not ready for reservation finalization.");
      }
      await finalizeBookingFromStripe({
        paymentIntentId,
        propertySlug,
        checkIn,
        checkOut,
        numGuests,
        firstName,
        lastName,
        email,
        phone,
        totalAmount: amountTotal,
        nightlyRate,
        cleaningFee: metadata.cleaningFee !== undefined ? Number(metadata.cleaningFee) : property.cleaningFee,
        ...(contractAcceptedAt ? { contractAcceptedAt } : {}),
      });
    } catch (error) {
      // Keep Stripe's retry/replay path open. A paid-but-unavailable stay requires
      // host reconciliation/refund, never another charge or an invented booking.
      console.error("booking_finalization_failed", {
        eventId: event.id, paymentIntentId,
        reason: error instanceof ReservationConflict ? "reservation_conflict" : "retry_required",
      });
      return NextResponse.json({ error: "Reservation needs retry or host review." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
