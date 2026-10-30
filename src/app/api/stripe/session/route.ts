import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { bookings, properties } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
    let confirmationCode: string | null = null;
    let bookingStatus: string | null = null;
    let bookingPaymentStatus: string | null = null;
    if (paymentIntentId) {
      const booking = await db.query.bookings.findFirst({
        where: eq(bookings.paymentIntentId, paymentIntentId),
        columns: { confirmationCode: true, bookingStatus: true, paymentStatus: true },
      });
      bookingStatus = booking?.bookingStatus ?? null;
      bookingPaymentStatus = booking?.paymentStatus ?? null;
      if (bookingStatus === "confirmed" && bookingPaymentStatus === "paid") {
        confirmationCode = booking?.confirmationCode ?? null;
      }
    }

    const propertySlug = session.metadata?.propertySlug;
    let guestContractPdfUrl: string | null = null;
    if (propertySlug) {
      try {
        const prop = await db.query.properties.findFirst({
          where: eq(properties.slug, propertySlug),
          columns: { guestContractPdfUrl: true },
        });
        const url = prop?.guestContractPdfUrl?.trim();
        guestContractPdfUrl = url || null;
      } catch (e) {
        console.error("Property contract URL lookup failed:", e);
      }
    }

    return NextResponse.json({
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      // Security: do NOT return customerEmail, customer_details, or the full
      // metadata bag. This endpoint is unauthenticated — anyone with a session
      // ID (which appears in success_url, browser history, Referer headers,
      // server logs) could otherwise read the guest's full PII. We allow-list
      // only the fields the success page needs to render the reservation card.
      // See security audit Finding #2 (CWE-639).
      metadata: {
        propertySlug: session.metadata?.propertySlug ?? "",
        propertyName: session.metadata?.propertyName ?? "",
        propertyImage: session.metadata?.propertyImage ?? "",
        numGuests: session.metadata?.numGuests ?? "",
        checkIn: session.metadata?.checkIn ?? "",
        checkOut: session.metadata?.checkOut ?? "",
      },
      confirmationCode,
      bookingStatus,
      bookingPaymentStatus,
      guestContractPdfUrl,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Stripe session fetch error:", error);
    return NextResponse.json({ error: "Unable to load payment status." }, { status: 500 });
  }
}
