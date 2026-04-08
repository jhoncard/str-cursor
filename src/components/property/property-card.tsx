"use client";

import { useState } from "react";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { isAirbnbOptimizerHost } from "@/lib/remote-image";

interface PropertyCardProps {
  title: string;
  slug: string;
  rating: number;
  reviewCount: number;
  maxGuests: number;
  beds: number;
  baths: number;
  sqft: number;
  price: number;
  available: string;
  images: string[];
}

export function PropertyCard({
  title,
  slug,
  rating,
  reviewCount,
  maxGuests,
  beds,
  baths,
  price,
  images,
}: PropertyCardProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const hasMultiple = images.length > 1;

  const goToPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((i) => (i === 0 ? images.length - 1 : i - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImage((i) => (i === images.length - 1 ? 0 : i + 1));
  };

  return (
    <Link
      href={`/properties/${slug}`}
      className="group relative flex flex-col bg-white border border-gray-100 hover:border-[#2b2b36]/20 hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2b2b36]/30"
      aria-label={`View details for ${title}`}
    >
      <div className="relative w-full h-48 overflow-hidden bg-gray-100">
        <Image
          src={images[currentImage]}
          alt={title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          unoptimized={isAirbnbOptimizerHost(images[currentImage])}
        />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/70 hover:bg-white backdrop-blur-md transition-colors z-10 text-[#2b2b36]"
          aria-label={`Save ${title}`}
        >
          <Heart className="w-4 h-4" />
        </button>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goToPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 hover:bg-white backdrop-blur-md transition-all z-10 text-[#2b2b36] opacity-0 group-hover:opacity-100"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 hover:bg-white backdrop-blur-md transition-all z-10 text-[#2b2b36] opacity-0 group-hover:opacity-100"
              aria-label="Next image"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {hasMultiple && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentImage ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col gap-2">
        <h3 className="text-[#2b2b36] font-semibold text-lg truncate tracking-tight">
          {title}
        </h3>

        <div className="flex items-center gap-3 text-gray-500 text-xs font-medium">
          <span>
            {rating.toFixed(2)} ({reviewCount})
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            {beds} Beds
          </span>
          <span className="flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {baths} Bath
          </span>
          <span>{maxGuests} Guests</span>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="text-[#2b2b36] font-bold text-lg">
            ${price.toLocaleString()}
            <span className="text-gray-400 text-xs font-medium ml-1">
              /night
            </span>
          </div>
          <span className="text-sm font-medium text-[#2b2b36] underline decoration-transparent group-hover:decoration-[#2b2b36] transition-colors underline-offset-4">
            View Details
          </span>
        </div>
      </div>
    </Link>
  );
}
