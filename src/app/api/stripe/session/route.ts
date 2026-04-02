import { NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
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
    if (paymentIntentId) {
      try {
        const booking = await db.query.bookings.findFirst({
          where: eq(bookings.paymentIntentId, paymentIntentId),
          columns: { confirmationCode: true },
        });
        confirmationCode = booking?.confirmationCode ?? null;
      } catch (dbError) {
        console.error("Booking lookup by payment intent failed:", dbError);
      }
    }

    return NextResponse.json({
      id: session.id,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      customerEmail: session.customer_details?.email ?? session.customer_email ?? null,
      metadata: session.metadata ?? {},
      confirmationCode,
    });
  } catch (error) {
    console.error("Stripe session fetch error:", error);
    return NextResponse.json({ error: "Unable to load payment status." }, { status: 500 });
  }
}
