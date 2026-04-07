import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addDays, eachDayOfInterval, format } from "date-fns";
import { and, eq, gte, lte } from "drizzle-orm";

import { Header } from "@/components/layout/header";
import { PriceCalendar } from "@/components/PriceCalendar";
import { db } from "@/lib/db";
import { availability, properties } from "@/lib/db/schema";
import type { ListingDailyRate } from "@/lib/pricelabs/types";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const row = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    columns: { name: true },
  });
  if (!row) {
    return { title: "Listing not found" };
  }
  return {
    title: row.name,
    description: `Availability and nightly rates for ${row.name}.`,
  };
}

export default async function ListingPage({ params }: PageProps) {
  const { slug } = await params;

  const listing = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    columns: {
      id: true,
      slug: true,
      name: true,
      basePriceNight: true,
    },
  });

  if (!listing) {
    notFound();
  }

  const startDate = new Date();
  const endDate = addDays(startDate, 120);
  const from = format(startDate, "yyyy-MM-dd");
  const to = format(endDate, "yyyy-MM-dd");

  const rows = await db
    .select({
      date: availability.date,
      priceOverride: availability.priceOverride,
      status: availability.status,
    })
    .from(availability)
    .where(
      and(
        eq(availability.propertyId, listing.id),
        gte(availability.date, from),
        lte(availability.date, to)
      )
    );

  const basePriceNight = Number(listing.basePriceNight);
  const safeBasePrice = Number.isFinite(basePriceNight) && basePriceNight >= 0 ? basePriceNight : 0;

  const byDate = new Map<
    string,
    { priceOverride: string | null; status: "available" | "booked" | "blocked" }
  >();
  for (const row of rows) {
    byDate.set(String(row.date), {
      priceOverride: row.priceOverride == null ? null : String(row.priceOverride),
      status: row.status,
    });
  }

  const dailyRates: ListingDailyRate[] = eachDayOfInterval({
    start: startDate,
    end: endDate,
  }).map((day) => {
    const date = format(day, "yyyy-MM-dd");
    const row = byDate.get(date);
    const override = row?.priceOverride == null ? NaN : Number(row.priceOverride);
    const price = Number.isFinite(override) && override >= 0 ? override : safeBasePrice;
    return {
      date,
      price: Math.round(price * 100) / 100,
      available: !row || row.status === "available",
    };
  });

  return (
    <div className="min-h-screen bg-[#f4f6f8] pb-16 font-sans">
      <Header />
      <main className="mx-auto mt-6 max-w-3xl px-4 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#2b2b36]">{listing.name}</h1>
        <p className="mt-2 text-sm text-gray-600">Slug: {listing.slug}</p>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-[#2b2b36]">Availability &amp; nightly rates</h2>
          <PriceCalendar rates={dailyRates} />
        </div>
      </main>
    </div>
  );
}
