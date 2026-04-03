import { Star } from "lucide-react";

interface PropertyReviewsProps {
  rating: number;
  reviewCount: number;
}

const categoryRatings = [
  { label: "Cleanliness", score: 4.9 },
  { label: "Communication", score: 5.0 },
  { label: "Check-in", score: 5.0 },
  { label: "Accuracy", score: 4.8 },
  { label: "Location", score: 4.7 },
  { label: "Value", score: 4.8 },
];

const sampleReviews = [
  {
    name: "Sarah M.",
    initials: "SM",
    date: "March 2026",
    rating: 5,
    comment:
      "Absolutely loved our stay! The place was spotless and beautifully decorated. The host was incredibly responsive and even left us a welcome note with local recommendations. Would definitely book again.",
  },
  {
    name: "James T.",
    initials: "JT",
    date: "February 2026",
    rating: 5,
    comment:
      "Perfect location, close to everything we needed. Check-in was seamless with the smart lock. The WiFi was super fast which was great for remote work. Highly recommend!",
  },
  {
    name: "Maria L.",
    initials: "ML",
    date: "January 2026",
    rating: 4,
    comment:
      "Great space with all the amenities you could want. The neighborhood is quiet and safe. Only minor note is that parking can be tight on weekends, but overall a fantastic experience.",
  },
  {
    name: "David K.",
    initials: "DK",
    date: "December 2025",
    rating: 5,
    comment:
      "This was our second time staying here and it was even better than the first. The host clearly takes pride in maintaining the property. The kitchen had everything we needed to cook meals.",
  },
];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const iconClass = size === "md" ? "w-5 h-5" : "w-3.5 h-3.5";
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconClass} ${
            i < Math.round(rating)
              ? "fill-[#2b2b36] text-[#2b2b36]"
              : "fill-gray-200 text-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

function RatingBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
      <div
        className="h-full rounded-full bg-[#2b2b36]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function PropertyReviews({ rating, reviewCount }: PropertyReviewsProps) {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#2b2b36] mb-8">Guest reviews</h2>

      <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 mb-10">
        <div className="flex flex-col items-center sm:items-start gap-2">
          <span className="text-6xl font-bold text-[#2b2b36]">{rating.toFixed(1)}</span>
          <StarRating rating={rating} size="md" />
          <span className="text-sm text-gray-500 font-medium">{reviewCount} reviews</span>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-4">
          {categoryRatings.map((cat) => (
            <div key={cat.label} className="flex items-center gap-4">
              <span className="text-sm font-medium text-[#2b2b36] w-28 shrink-0">
                {cat.label}
              </span>
              <div className="flex-1">
                <RatingBar score={cat.score} />
              </div>
              <span className="text-sm font-semibold text-[#2b2b36] w-8 text-right">
                {cat.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sampleReviews.map((review) => (
          <div
            key={review.name}
            className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#2b2b36] text-white flex items-center justify-center text-sm font-semibold">
                {review.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2b2b36]">{review.name}</p>
                <p className="text-xs text-gray-500">{review.date}</p>
              </div>
              <div className="ml-auto">
                <StarRating rating={review.rating} />
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
