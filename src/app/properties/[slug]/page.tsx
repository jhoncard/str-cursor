import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { addYears, format } from "date-fns";
import { propertiesData } from "@/data/properties";
import { getBlockedDates } from "@/lib/availability";
import { getNightlyPriceMapForCalendar } from "@/lib/pricing/calendar-nightly-prices";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Header } from "@/components/layout/header";
import { MapPin, Users, BedDouble, Bath, CheckCircle2, Star, Share, Heart } from "lucide-react";

import { PropertyDetailBookingCard } from "@/components/property/property-detail-booking-card";
import { ImageGallery } from "@/components/property/image-gallery";
import { PropertyReviews } from "@/components/property/property-reviews";
import { HostCard } from "@/components/property/host-card";
import { SimilarProperties } from "@/components/property/similar-properties";
import { PropertyFaq } from "@/components/property/property-faq";
import { MobileBookingBar } from "@/components/property/mobile-booking-bar";
import { VacationRentalJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getPropertyGalleryImageUrlsBySlug } from "@/lib/property-gallery-images";

async function resolveGalleryImages(
  slug: string,
  fallback: string[]
): Promise<string[]> {
  const fromDb = await getPropertyGalleryImageUrlsBySlug(slug);
  return fromDb.length > 0 ? fromDb : fallback;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = propertiesData.find((p) => p.slug === slug);

  if (!property) {
    return { title: "Property Not Found" };
  }

  const images = await resolveGalleryImages(slug, property.images);

  return {
    title: property.name,
    description: property.shortDescription,
    openGraph: {
      title: `${property.name} | Feathers Houses`,
      description: property.shortDescription,
      images: images[0] ? [{ url: images[0] }] : [],
    },
  };
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = propertiesData.find((p) => p.slug === slug);

  if (!property) {
    notFound();
  }

  const galleryImages = await resolveGalleryImages(slug, property.images);
  const propertyForDisplay = { ...property, images: galleryImages };

  const rangeStart = new Date();
  const rangeEnd = addYears(rangeStart, 2);
  let dbProperty: { id: string } | undefined;
  let blockedDateStrings: string[] = [];
  let nightlyPrices:
    | Awaited<ReturnType<typeof getNightlyPriceMapForCalendar>>
    | undefined;

  try {
    dbProperty = await db.query.properties.findFirst({
      where: eq(properties.slug, slug),
      columns: { id: true },
    });
    const blockedDates = await getBlockedDates(
      dbProperty?.id ?? property.id,
      rangeStart,
      rangeEnd
    );
    blockedDateStrings = blockedDates.map((d) => format(d, "yyyy-MM-dd"));
    if (dbProperty?.id != null) {
      nightlyPrices = await getNightlyPriceMapForCalendar(
        dbProperty.id,
        rangeStart,
        rangeEnd,
        property.basePriceNight
      );
    }
  } catch (err) {
    console.error("[properties/[slug]] database load failed:", err);
  }

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24">
      <VacationRentalJsonLd property={propertyForDisplay} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", href: "/" },
          { name: "Properties", href: "/properties" },
          { name: property.name, href: `/properties/${property.slug}` },
        ]}
      />
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-2">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#2b2b36] tracking-tight">
              {property.name}
            </h1>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-[#2b2b36] text-[#2b2b36]" />
                {property.rating.toFixed(2)} ({property.reviewCount} reviews)
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {property.locationCity}, FL
              </span>
              <span>{property.isSuperhost ? `Hosted by ${property.hostName} (Superhost)` : `Hosted by ${property.hostName}`}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-[#2b2b36] hover:bg-white transition-colors text-sm font-medium shadow-sm bg-white/50 backdrop-blur-sm">
              <Share className="w-4 h-4" /> Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-[#2b2b36] hover:bg-white transition-colors text-sm font-medium shadow-sm bg-white/50 backdrop-blur-sm">
              <Heart className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        <ImageGallery images={galleryImages} propertyName={property.name} />

        <div className="flex flex-col lg:flex-row gap-12 mt-12 relative">
          
          <div className="flex-1 flex flex-col gap-10">
            
            <div className="flex flex-wrap items-center gap-6 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-full shadow-sm"><Users className="w-5 h-5 text-[#2b2b36]" /></div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Guests</div>
                  <div className="font-semibold text-[#2b2b36]">{property.maxGuests} Maximum</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-full shadow-sm"><BedDouble className="w-5 h-5 text-[#2b2b36]" /></div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Bedrooms</div>
                  <div className="font-semibold text-[#2b2b36]">{property.bedrooms} Rooms</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white rounded-full shadow-sm"><Bath className="w-5 h-5 text-[#2b2b36]" /></div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">Bathrooms</div>
                  <div className="font-semibold text-[#2b2b36]">{property.bathrooms} Full</div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-[#2b2b36] mb-4">About this home</h2>
              <p className="text-gray-600 leading-relaxed max-w-3xl">
                {property.shortDescription}
                <br /><br />
                Whether you are traveling for business or leisure, this meticulously maintained property offers everything you need. The space is entirely designed with comfort and elegance in mind, offering high-end furnishings, lightning-fast WiFi, and easy access to the best attractions in {property.locationCity}.
              </p>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-[#2b2b36] mb-6">What this place offers</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-8 text-gray-600 font-medium">
                {property.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#2b2b36]" /> {amenity}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-semibold text-[#2b2b36] mb-4">House rules</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600">
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-[#2b2b36]">Check-in</p>
                  <p className="text-sm mt-1">From {property.checkInFrom}</p>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-[#2b2b36]">Check-out</p>
                  <p className="text-sm mt-1">Before {property.checkOutBy}</p>
                </div>
                <div className="sm:col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-[#2b2b36] mb-2">Property rules</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {property.houseRules.map((rule) => (
                      <li key={rule}>• {rule}</li>
                    ))}
                  </ul>
                </div>
                <div className="sm:col-span-2 bg-white rounded-2xl border border-gray-100 p-4">
                  <p className="text-sm font-medium text-[#2b2b36]">Cancellation policy</p>
                  <p className="text-sm mt-1">{property.cancellationPolicy}</p>
                </div>
              </div>
            </div>

            <PropertyReviews
              rating={property.rating}
              reviewCount={property.reviewCount}
            />

            <HostCard
              hostName={property.hostName}
              isSuperhost={property.isSuperhost}
            />
          </div>

          <div className="w-full lg:w-[400px]">
            <div id="booking-card">
              <PropertyDetailBookingCard
                slug={property.slug}
                basePriceNight={property.basePriceNight}
                cleaningFee={property.cleaningFee}
                serviceFee={property.serviceFee}
                maxGuests={property.maxGuests}
                blockedDateStrings={blockedDateStrings}
                nightlyPrices={nightlyPrices}
              />
            </div>
          </div>
          
        </div>

        <div className="mt-16 flex flex-col gap-16">
          <PropertyFaq />
          <SimilarProperties currentSlug={property.slug} />
        </div>
      </main>

      <MobileBookingBar basePriceNight={property.basePriceNight} />
    </div>
  );
}
