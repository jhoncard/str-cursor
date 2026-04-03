import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Guest Reviews",
  description:
    "Read what our guests have to say about their stays at Feathers Houses in Tampa Bay.",
};

const reviews = [
  {
    id: 1,
    guestName: "Sarah M.",
    propertyName: "Private entrance and private bath Cozy room Tampa",
    rating: 5,
    date: "March 2026",
    comment:
      "Absolutely loved this place! The room was spotless, the bed was incredibly comfortable, and Jhon was an amazing host. The private entrance made it so easy to come and go. Would definitely stay again.",
  },
  {
    id: 2,
    guestName: "David K.",
    propertyName: "Tampa cozy private room paradise",
    rating: 5,
    date: "February 2026",
    comment:
      "Perfect spot for my business trip. The dedicated workspace was a great touch, and the kitchen had everything I needed. Quiet neighborhood and easy parking. Highly recommend.",
  },
  {
    id: 3,
    guestName: "Emily R.",
    propertyName: "St Pete Oasis: Heated Pool, Hot Tub, Pet-Friendly",
    rating: 5,
    date: "January 2026",
    comment:
      "We brought the whole family and had an incredible time. The heated pool was the highlight for the kids, and the house was spacious enough for everyone. The hot tub was perfect after a day at the beach.",
  },
  {
    id: 4,
    guestName: "Michael T.",
    propertyName: "Private small house in Tampa",
    rating: 4,
    date: "December 2025",
    comment:
      "Great little guesthouse with full privacy. Had everything we needed for a week-long stay. The self check-in process was smooth and the place was very clean. Only wish there was a bit more counter space in the kitchen.",
  },
  {
    id: 5,
    guestName: "Jessica L.",
    propertyName: "Private entrance and private bath Cozy room Tampa",
    rating: 5,
    date: "November 2025",
    comment:
      "This was my third time staying here and it never disappoints. Jhon keeps the place in excellent condition and always responds quickly to messages. The WiFi speed is fantastic for remote work.",
  },
  {
    id: 6,
    guestName: "Robert W.",
    propertyName: "St Pete Oasis: Heated Pool, Hot Tub, Pet-Friendly",
    rating: 5,
    date: "October 2025",
    comment:
      "Hosted a small family reunion here and it was perfect. Plenty of room for everyone, the pool area is beautiful, and the location in St. Pete is ideal. We were close to everything but still had a peaceful retreat to come back to.",
  },
  {
    id: 7,
    guestName: "Amanda C.",
    propertyName: "Tampa cozy private room paradise",
    rating: 4,
    date: "September 2025",
    comment:
      "Lovely guest suite with a modern feel. The private entrance and bathroom were a big plus. Location was convenient for exploring Tampa. Daniel was responsive and helpful with restaurant recommendations.",
  },
  {
    id: 8,
    guestName: "Carlos G.",
    propertyName: "Private small house in Tampa",
    rating: 5,
    date: "August 2025",
    comment:
      "Stayed here for two weeks while relocating to Tampa and it felt like home. The full kitchen saved us a fortune on dining out, and the peaceful backyard was a nice bonus. Highly recommend for longer stays.",
  },
];

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-widest text-[#2b2b36]/50 uppercase mb-3">
            Testimonials
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36] mb-3">
            Guest Reviews
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Hear from travelers who have experienced our Tampa Bay properties firsthand.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col"
            >
              <div className="flex items-center gap-1 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating
                        ? "fill-amber-400 text-amber-400"
                        : "fill-gray-200 text-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed flex-1 mb-4">
                &ldquo;{review.comment}&rdquo;
              </p>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-sm font-semibold text-[#2b2b36]">{review.guestName}</p>
                <p className="text-xs text-gray-400 mt-0.5">{review.propertyName}</p>
                <p className="text-xs text-gray-400">{review.date}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
