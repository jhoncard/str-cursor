import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Explore Feathers Houses rental properties across the Tampa Bay area.",
};

const locations = [
  {
    name: "Tampa",
    slug: "tampa",
    description:
      "Florida's vibrant Gulf Coast city, known for its lively waterfront, cultural attractions like the Tampa Riverwalk, and thriving food scene in neighborhoods like Ybor City and SoHo. Our Tampa properties place you near top restaurants, parks, and entertainment.",
    propertyCount: 3,
  },
  {
    name: "St. Petersburg",
    slug: "st-petersburg",
    description:
      "The Sunshine City lives up to its name with world-class museums, beautiful Gulf beaches, and a bustling downtown arts district. St. Pete offers a laid-back coastal lifestyle with easy access to Fort De Soto Park, the Dali Museum, and miles of waterfront trails.",
    propertyCount: 1,
  },
];

export default function LocationsPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-widest text-[#2b2b36]/50 uppercase mb-3">
            Explore
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36] mb-3">
            Our Locations
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            We host guests across the Tampa Bay area. Choose a city to see available properties
            and local highlights.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {locations.map((location) => (
            <Link
              key={location.slug}
              href={`/locations/${location.slug}`}
              className="group bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-[#2b2b36] group-hover:text-[#2b2b36]/80 transition-colors">
                    {location.name}
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    {location.propertyCount} {location.propertyCount === 1 ? "property" : "properties"}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center group-hover:bg-[#2b2b36] transition-colors">
                  <ArrowRight className="w-4 h-4 text-[#2b2b36] group-hover:text-white transition-colors" />
                </div>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">{location.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
