import { propertiesData } from "@/data/properties";
import { PropertyCard } from "./property-card";

interface SimilarPropertiesProps {
  currentSlug: string;
}

export function SimilarProperties({ currentSlug }: SimilarPropertiesProps) {
  const others = propertiesData
    .filter((p) => p.slug !== currentSlug)
    .slice(0, 3);

  if (others.length === 0) return null;

  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#2b2b36] mb-8">
        You might also like
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {others.map((p) => (
          <PropertyCard
            key={p.id}
            title={p.name}
            slug={p.slug}
            rating={p.rating}
            reviewCount={p.reviewCount}
            maxGuests={p.maxGuests}
            beds={p.beds}
            baths={p.bathrooms}
            sqft={0}
            price={p.basePriceNight}
            available="Available"
            images={p.images}
          />
        ))}
      </div>
    </section>
  );
}
