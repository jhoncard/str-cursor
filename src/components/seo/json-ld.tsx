import type { Property } from "@/data/properties";
import { SITE_CONTACT_EMAIL } from "@/lib/site-contact";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://feathershouses.com";

function JsonLdScript({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function LodgingBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: "Feathers Houses",
    description:
      "Premium short-term vacation rentals in Tampa and St. Petersburg, Florida. Book directly and save 10-15%.",
    url: BASE_URL,
    telephone: "(603) 484-9623, (651) 285-6410",
    email: SITE_CONTACT_EMAIL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Tampa",
      addressRegion: "FL",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: 27.9506,
      longitude: -82.4572,
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.87",
      reviewCount: "252",
      bestRating: "5",
    },
    priceRange: "$85 - $450",
  };

  return <JsonLdScript data={data} />;
}

export function VacationRentalJsonLd({ property }: { property: Property }) {
  const propertyTypeMap: Record<string, string> = {
    room: "Room",
    guest_suite: "Suite",
    guesthouse: "House",
    entire_home: "House",
  };

  const data = {
    "@context": "https://schema.org",
    "@type": "VacationRental",
    name: property.name,
    description: property.shortDescription,
    url: `${BASE_URL}/properties/${property.slug}`,
    image: property.images,
    address: {
      "@type": "PostalAddress",
      addressLocality: property.locationCity,
      addressRegion: "FL",
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: property.locationLat,
      longitude: property.locationLng,
    },
    numberOfBedrooms: property.bedrooms,
    numberOfBathroomsTotal: property.bathrooms,
    occupancy: {
      "@type": "QuantitativeValue",
      maxValue: property.maxGuests,
    },
    accommodationCategory: propertyTypeMap[property.propertyType] || "Other",
    petsAllowed: property.amenities.some((a) =>
      a.toLowerCase().includes("pets allowed")
    ),
    amenityFeature: property.amenities.map((amenity) => ({
      "@type": "LocationFeatureSpecification",
      name: amenity,
      value: true,
    })),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: String(property.rating),
      reviewCount: String(property.reviewCount),
      bestRating: "5",
    },
    offers: {
      "@type": "Offer",
      price: String(property.basePriceNight),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
    checkinTime: property.checkInFrom,
    checkoutTime: property.checkOutBy,
  };

  return <JsonLdScript data={data} />;
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; href: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${BASE_URL}${item.href}`,
    })),
  };

  return <JsonLdScript data={data} />;
}
