import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";
import { isStayAvailable } from "@/lib/availability";
import { computeStayAccommodationSubtotal } from "@/lib/pricing/stay-quote";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Security: server-side schema validation. Caps every string so attacker
// payloads cannot reach Stripe metadata (which has a 500-char per-value
// limit), Resend templates, or the database. Date format is enforced as
// yyyy-MM-dd so downstream new Date() math cannot produce nonsense.
// See security audit Finding #3 (CWE-20).
const CheckoutSchema = z.object({
  slug: z.string().min(1).max(200),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().min(5).max(30),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkIn must be yyyy-MM-dd"),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "checkOut must be yyyy-MM-dd"),
  numGuests: z.number().int().min(1).max(50),
  specialRequests: z.string().trim().max(1000).optional(),
  arrivalTime: z.string().trim().max(20).optional(),
  contractAccepted: z.boolean().optional(),
});

type CheckoutPayload = z.infer<typeof CheckoutSchema>;

function toCurrencyAmount(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = CheckoutSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please check the booking details and try again." },
        { status: 400 },
      );
    }
    const body: CheckoutPayload = parsed.data;
    const property = propertiesData.find((item) => item.slug === body.slug);

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (body.numGuests < 1 || body.numGuests > property.maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between 1 and ${property.maxGuests}.` },
        { status: 400 }
      );
    }

    const dbProperty = await db.query.properties.findFirst({
      where: eq(properties.slug, property.slug),
      columns: { id: true, guestContractPdfUrl: true, cleaningFee: true },
    });
    if (!dbProperty?.id) {
      return NextResponse.json(
        { error: "This property is not available for online booking yet." },
        { status: 400 }
      );
    }
    const availabilityPropertyId = dbProperty.id;

    const guestContractPdfUrl = dbProperty.guestContractPdfUrl?.trim() ?? "";
    if (guestContractPdfUrl.length > 0 && body.contractAccepted !== true) {
      return NextResponse.json(
        { error: "You must accept the rental agreement for this property before payment." },
        { status: 400 },
      );
    }

    const contractAcceptedAtIso =
      guestContractPdfUrl.length > 0 ? new Date().toISOString() : undefined;

    if (!(await isStayAvailable(availabilityPropertyId, body.checkIn, body.checkOut))) {
      return NextResponse.json(
        { error: "Those dates are not available. They may be booked on another channel. Choose different dates." },
        { status: 409 }
      );
    }

    const accommodation = await computeStayAccommodationSubtotal(
      dbProperty.id,
      body.checkIn,
      body.checkOut,
      { fallbackBasePriceNight: property.basePriceNight }
    );
    const cleaningFeeAmount = Number(dbProperty.cleaningFee ?? property.cleaningFee);
    const serviceFeeAmount = property.serviceFee;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: `${property.name} — ${accommodation.nights} night${accommodation.nights === 1 ? "" : "s"}`,
              description: `${body.checkIn} → ${body.checkOut}`,
            },
            unit_amount: toCurrencyAmount(accommodation.subtotal),
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Cleaning fee",
            },
            unit_amount: toCurrencyAmount(cleaningFeeAmount),
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Service fee",
            },
            unit_amount: toCurrencyAmount(serviceFeeAmount),
          },
        },
      ],
      metadata: {
        propertySlug: property.slug,
        propertyName: property.name,
        propertyImage: property.images[0],
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        numGuests: String(body.numGuests),
        accommodationSubtotal: String(accommodation.subtotal),
        pricingNights: String(accommodation.nights),
        ...(body.specialRequests ? { specialRequests: body.specialRequests } : {}),
        ...(body.arrivalTime ? { arrivalTime: body.arrivalTime } : {}),
        ...(contractAcceptedAtIso
          ? {
              contractAcceptedAt: contractAcceptedAtIso,
              guestContractProvided: "true",
            }
          : {}),
      },
      success_url: `${baseUrl}/properties/${property.slug}/book/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/properties/${property.slug}/book?checkIn=${body.checkIn}&checkOut=${body.checkOut}&guests=${body.numGuests}`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return NextResponse.json(
      { error: "Unable to start Stripe Checkout right now." },
      { status: 500 }
    );
  }
}
