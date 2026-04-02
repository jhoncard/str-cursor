import { NextRequest, NextResponse } from "next/server";

import { propertiesData } from "@/data/properties";
import { getStripe } from "@/lib/stripe";

interface CheckoutPayload {
  slug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  numGuests: number;
}

function toCurrencyAmount(value: number) {
  return Math.round(value * 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckoutPayload;
    const property = propertiesData.find((item) => item.slug === body.slug);

    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    if (!body.numGuests || body.numGuests < 1 || body.numGuests > property.maxGuests) {
      return NextResponse.json(
        { error: `Guest count must be between 1 and ${property.maxGuests}.` },
        { status: 400 }
      );
    }

    const checkIn = new Date(`${body.checkIn}T00:00:00Z`);
    const checkOut = new Date(`${body.checkOut}T00:00:00Z`);
    const nights = Math.max(
      1,
      Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    );

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: body.email,
      line_items: [
        {
          quantity: nights,
          price_data: {
            currency: "usd",
            product_data: {
              name: `${property.name} - Nightly rate`,
              description: `${body.checkIn} to ${body.checkOut}`,
            },
            unit_amount: toCurrencyAmount(property.basePriceNight),
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Cleaning fee",
            },
            unit_amount: toCurrencyAmount(property.cleaningFee),
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            product_data: {
              name: "Service fee",
            },
            unit_amount: toCurrencyAmount(property.serviceFee),
          },
        },
      ],
      metadata: {
        propertySlug: property.slug,
        propertyName: property.name,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        numGuests: String(body.numGuests),
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
