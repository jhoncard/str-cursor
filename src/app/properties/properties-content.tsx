"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PropertyCard } from "@/components/property/property-card";
import { MapView } from "@/components/property/map-view";
import { FilterBar } from "@/components/property/filter-bar";
import { propertiesData } from "@/data/properties";

function PropertiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const cityQuery = searchParams.get("city");
  const guestsQuery = searchParams.get("guests");
  const typeFilter = searchParams.get("type") || "";
  const petsFilter = searchParams.get("pets") === "true";
  const minPriceParam = searchParams.get("minPrice");
  const maxPriceParam = searchParams.get("maxPrice");
  const minBedsParam = searchParams.get("minBeds");
  const sortParam = searchParams.get("sort") || "";

  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(
    null,
  );

  const filteredProperties = propertiesData.filter((property) => {
    if (cityQuery && cityQuery !== "Any") {
      if (property.locationCity !== cityQuery) return false;
    }

    if (guestsQuery) {
      const minGuests = parseInt(guestsQuery, 10);
      if (!isNaN(minGuests) && property.maxGuests < minGuests) return false;
    }

    if (typeFilter === "house") {
      if (
        property.propertyType !== "entire_home" &&
        property.propertyType !== "guesthouse"
      )
        return false;
    } else if (typeFilter === "room") {
      if (
        property.propertyType !== "room" &&
        property.propertyType !== "guest_suite"
      )
        return false;
    }

    if (
      petsFilter &&
      !property.amenities.some((a) =>
        a.toLowerCase().includes("pets allowed"),
      )
    ) {
      return false;
    }

    if (minPriceParam) {
      const min = parseInt(minPriceParam, 10);
      if (!isNaN(min) && property.basePriceNight < min) return false;
    }

    if (maxPriceParam) {
      const max = parseInt(maxPriceParam, 10);
      if (!isNaN(max) && property.basePriceNight > max) return false;
    }

    if (minBedsParam) {
      const beds = parseInt(minBedsParam, 10);
      if (!isNaN(beds) && property.bedrooms < beds) return false;
    }

    return true;
  });

  if (sortParam === "price-asc") {
    filteredProperties.sort((a, b) => a.basePriceNight - b.basePriceNight);
  } else if (sortParam === "price-desc") {
    filteredProperties.sort((a, b) => b.basePriceNight - a.basePriceNight);
  } else if (sortParam === "rating") {
    filteredProperties.sort((a, b) => b.rating - a.rating);
  }

  return (
    <main className="flex-1 flex w-full max-w-[1600px] mx-auto overflow-hidden relative">
      <div className="w-full lg:w-[55%] h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 flex flex-col gap-6 bg-white/50 backdrop-blur-sm z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-[#2b2b36]">
            Stays in{" "}
            {cityQuery && cityQuery !== "Any" ? cityQuery : "Tampa Bay"}
          </h1>
          <p className="text-gray-500 text-sm">
            {filteredProperties.length} properties found
          </p>
        </div>

        <FilterBar />

        {filteredProperties.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/50 rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <h2 className="text-xl font-semibold text-[#2b2b36] mb-2">
              No properties found
            </h2>
            <p className="text-gray-500 text-sm max-w-md">
              We couldn&apos;t find any properties matching your exact search
              criteria. Try adjusting your dates, guests, or location.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {filteredProperties.map((property) => (
              <div
                key={property.id}
                onMouseEnter={() => setHoveredPropertyId(property.id)}
                onMouseLeave={() => setHoveredPropertyId(null)}
              >
                <PropertyCard
                  title={property.name}
                  slug={property.slug}
                  rating={property.rating}
                  reviewCount={property.reviewCount}
                  maxGuests={property.maxGuests}
                  beds={property.bedrooms}
                  baths={property.bathrooms}
                  sqft={property.maxGuests * 200}
                  price={property.basePriceNight}
                  available="Now"
                  images={property.images}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:block w-[45%] h-full p-6 relative z-0">
        <MapView
          properties={filteredProperties}
          hoveredPropertyId={hoveredPropertyId}
          onPropertySelect={(slug) => router.push(`/properties/${slug}`)}
        />
      </div>
    </main>
  );
}

export default function PropertiesPageClient() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#2b2b36] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <PropertiesContent />
    </Suspense>
  );
}
