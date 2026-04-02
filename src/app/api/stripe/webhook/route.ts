import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { finalizeBookingFromStripe } from "@/app/actions/booking";
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
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
    const numGuests = Number.parseInt(metadata.numGuests ?? "0", 10);

    if (!propertySlug || !checkIn || !checkOut || !firstName || !lastName || !email || !paymentIntentId) {
      return NextResponse.json({ error: "Missing required session metadata." }, { status: 400 });
    }

    const property = propertiesData.find((item) => item.slug === propertySlug);
    if (!property) {
      return NextResponse.json({ error: "Property metadata is invalid." }, { status: 400 });
    }

    const amountTotal = (session.amount_total ?? 0) / 100;
    const nights = Math.max(
      1,
      Math.ceil(
        (new Date(`${checkOut}T00:00:00Z`).getTime() - new Date(`${checkIn}T00:00:00Z`).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const nightlyRate = nights > 0 ? (property.basePriceNight) : property.basePriceNight;

    const finalized = await finalizeBookingFromStripe({
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
      cleaningFee: property.cleaningFee,
    });

    if (!finalized.success) {
      return NextResponse.json({ error: finalized.error }, { status: 400 });
    }
  }

  return NextResponse.json({ received: true });
}
