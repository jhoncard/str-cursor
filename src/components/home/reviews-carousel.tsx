import { Star } from "lucide-react";

const reviews = [
  {
    guest: "Sarah M.",
    property: "Tampa Bungalow",
    rating: 5.0,
    comment:
      "Absolutely perfect stay. The self check-in was seamless and the place was spotless. Will definitely book again!",
    date: "March 2026",
  },
  {
    guest: "James R.",
    property: "St. Pete Beach House",
    rating: 4.9,
    comment:
      "Loved every minute. Steps from the beach, beautifully decorated, and the host was incredibly responsive.",
    date: "February 2026",
  },
  {
    guest: "Emily T.",
    property: "Downtown Tampa Loft",
    rating: 5.0,
    comment:
      "Best Airbnb experience we have ever had. Booking direct saved us almost $80 on a 4-night stay.",
    date: "January 2026",
  },
  {
    guest: "Carlos D.",
    property: "Tampa Bungalow",
    rating: 4.8,
    comment:
      "Great location, super clean, and our dog was welcomed with treats. Highly recommend for pet owners.",
    date: "December 2025",
  },
  {
    guest: "Megan W.",
    property: "St. Pete Beach House",
    rating: 5.0,
    comment:
      "The photos do not do it justice. Stunning property with everything you need for a relaxing vacation.",
    date: "November 2025",
  },
  {
    guest: "David K.",
    property: "Downtown Tampa Loft",
    rating: 4.9,
    comment:
      "Walkable to restaurants, rooftop views, and the smart lock made late arrival stress-free.",
    date: "October 2025",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4 fill-amber-400 text-amber-400"
        />
      ))}
      <span className="text-sm font-medium text-[#2b2b36] ml-1">
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

export function ReviewsCarousel() {
  return (
    <section className="mt-14 md:mt-20">
      <h2 className="text-2xl md:text-3xl font-semibold text-[#2b2b36] mb-8">
        What Our Guests Say
      </h2>

      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
        {reviews.map((review, i) => (
          <div
            key={i}
            className="min-w-[300px] max-w-[340px] flex-shrink-0 snap-start bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex flex-col gap-4"
          >
            <StarRating rating={review.rating} />
            <p className="text-gray-600 text-sm leading-relaxed flex-1">
              &ldquo;{review.comment}&rdquo;
            </p>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[#2b2b36] font-semibold text-sm">
                {review.guest}
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {review.property} &middot; {review.date}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
