import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { propertiesData } from "@/data/properties";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, Users, BedDouble, Bath } from "lucide-react";

type CityData = {
  name: string;
  description: string;
  attractions: string[];
  filterValue: string;
};

const cityMap: Record<string, CityData> = {
  tampa: {
    name: "Tampa",
    description:
      "Tampa is a dynamic city on Florida's Gulf Coast, blending urban energy with waterfront charm. From the historic streets of Ybor City to the scenic Tampa Riverwalk, the city offers a diverse mix of culture, dining, and outdoor activities. Whether you're here for business, a family vacation, or a weekend escape, Tampa delivers an unforgettable experience.",
    attractions: [
      "Tampa Riverwalk",
      "Busch Gardens Tampa Bay",
      "The Florida Aquarium",
      "Ybor City Historic District",
      "Bayshore Boulevard",
      "Armature Works",
      "ZooTampa at Lowry Park",
      "Sparkman Wharf",
    ],
    filterValue: "Tampa",
  },
  "st-petersburg": {
    name: "St. Petersburg",
    description:
      "Known as the Sunshine City, St. Petersburg boasts over 360 days of sunshine per year. This waterfront gem is home to world-class museums, vibrant murals, craft breweries, and some of the best beaches on the Gulf Coast. Its walkable downtown, thriving arts scene, and relaxed coastal vibe make it a top destination for travelers of all kinds.",
    attractions: [
      "The Dali Museum",
      "Fort De Soto Park",
      "St. Pete Beach",
      "The Chihuly Collection",
      "Sunken Gardens",
      "Central Avenue Arts District",
      "Vinoy Park",
      "Treasure Island Beach",
    ],
    filterValue: "St. Petersburg",
  },
};

export function generateStaticParams() {
  return Object.keys(cityMap).map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city } = await params;
  const data = cityMap[city];
  if (!data) return { title: "Location Not Found" };
  return {
    title: `${data.name} Rentals`,
    description: `Browse vacation rental properties in ${data.name}, FL from Feathers Houses.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const data = cityMap[city];

  if (!data) notFound();

  const cityProperties = propertiesData.filter(
    (p) => p.locationCity === data.filterValue
  );

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="mb-4">
          <Link
            href="/locations"
            className="text-sm text-gray-400 hover:text-[#2b2b36] transition-colors"
          >
            Locations
          </Link>
          <span className="text-sm text-gray-300 mx-2">/</span>
          <span className="text-sm text-[#2b2b36] font-medium">{data.name}</span>
        </div>

        <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36] mb-4">
            {data.name}, Florida
          </h1>
          <div className="w-16 h-[2px] bg-[#2b2b36] mb-6" />
          <p className="text-gray-600 leading-relaxed max-w-3xl">{data.description}</p>
        </section>

        <section className="bg-white rounded-3xl p-8 md:p-12 shadow-sm mb-8">
          <h2 className="text-2xl font-semibold text-[#2b2b36] mb-6">Nearby Attractions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.attractions.map((attraction) => (
              <div
                key={attraction}
                className="bg-[#f4f6f8] rounded-xl px-5 py-4 text-sm font-medium text-[#2b2b36]"
              >
                {attraction}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold text-[#2b2b36] mb-6">
            Properties in {data.name}
          </h2>
          {cityProperties.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 shadow-sm text-center">
              <p className="text-gray-500">
                No properties are currently listed in {data.name}. Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {cityProperties.map((property) => (
                <Link
                  key={property.id}
                  href={`/properties/${property.slug}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={property.images[0]}
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#2b2b36] mb-1 line-clamp-1">
                      {property.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-3">{property.locationAddress}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {property.maxGuests}
                      </span>
                      <span className="flex items-center gap-1">
                        <BedDouble className="w-3.5 h-3.5" /> {property.bedrooms}
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5" /> {property.bathrooms}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-medium text-[#2b2b36]">
                          {property.rating}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({property.reviewCount})
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-[#2b2b36]">
                        ${property.basePriceNight}
                        <span className="text-xs font-normal text-gray-400"> /night</span>
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
