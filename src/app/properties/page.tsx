"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { PropertyCard } from "@/components/property/property-card";
import { MapView } from "@/components/property/map-view";
import { propertiesData, Property } from "@/data/properties";

function PropertiesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cityQuery = searchParams.get("city");
  const guestsQuery = searchParams.get("guests");
  
  const [hoveredPropertyId, setHoveredPropertyId] = useState<string | null>(null);

  // Filter properties based on URL query parameters
  const filteredProperties = propertiesData.filter((property) => {
    let matches = true;
    
    if (cityQuery && cityQuery !== "Any") {
      if (property.locationCity !== cityQuery) matches = false;
    }
    
    if (guestsQuery) {
      const minGuests = parseInt(guestsQuery, 10);
      if (!isNaN(minGuests) && property.maxGuests < minGuests) matches = false;
    }

    return matches;
  });

  return (
    <main className="flex-1 flex w-full max-w-[1600px] mx-auto overflow-hidden relative">
      {/* Left Side: Results List */}
      <div className="w-full lg:w-[55%] h-full overflow-y-auto custom-scrollbar p-6 lg:p-8 flex flex-col gap-6 bg-white/50 backdrop-blur-sm z-10">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#2b2b36]">
              Stays in {cityQuery && cityQuery !== "Any" ? cityQuery : "Tampa Bay"}
            </h1>
            <p className="text-gray-500 text-sm mt-1">{filteredProperties.length} properties found</p>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-full text-[#2b2b36] font-medium hover:border-[#2b2b36] transition-colors shadow-sm">
              Price
            </button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-full text-[#2b2b36] font-medium hover:border-[#2b2b36] transition-colors shadow-sm">
              Property Type
            </button>
            <button className="px-4 py-2 bg-white border border-gray-200 rounded-full text-[#2b2b36] font-medium hover:border-[#2b2b36] transition-colors shadow-sm">
              More Filters
            </button>
          </div>
        </div>

        {filteredProperties.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/50 rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <h2 className="text-xl font-semibold text-[#2b2b36] mb-2">No properties found</h2>
            <p className="text-gray-500 text-sm max-w-md">
              We couldn't find any properties matching your exact search criteria. Try adjusting your dates, guests, or location.
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
                  sqft={property.maxGuests * 200} // Mock sqft based on guests for now
                  price={property.basePriceNight}
                  available="Now"
                  image={property.images[0]}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Side: Map */}
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

export default function PropertiesPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans flex flex-col h-screen overflow-hidden">
      <div className="shrink-0 bg-white shadow-sm z-10 relative">
        <Header />
      </div>

      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#2b2b36] border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <PropertiesContent />
      </Suspense>
    </div>
  );
}
