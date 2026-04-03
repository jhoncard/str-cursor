"use client";

import { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { Camera } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
  propertyName: string;
}

export function ImageGallery({ images, propertyName }: ImageGalleryProps) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const displayImages = images.length >= 5
    ? images.slice(0, 5)
    : [
        ...images,
        ...Array.from({ length: 5 - images.length }, (_, i) => images[i % images.length]),
      ];

  const slides = images.map((src) => ({ src }));

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 h-[400px] sm:h-[500px] lg:h-[600px] rounded-[2rem] overflow-hidden relative">
        <button
          type="button"
          onClick={() => openAt(0)}
          className="md:col-span-2 relative h-full bg-gray-200 cursor-pointer focus:outline-none"
        >
          <Image
            src={displayImages[0]}
            alt={propertyName}
            fill
            className="object-cover hover:brightness-95 transition-all"
            priority
          />
        </button>

        <div className="hidden md:grid md:col-span-2 grid-cols-2 grid-rows-2 gap-2 h-full">
          {displayImages.slice(1, 5).map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => openAt(i + 1)}
              className="relative bg-gray-200 cursor-pointer focus:outline-none"
            >
              <Image
                src={src}
                alt={`${propertyName} ${i + 2}`}
                fill
                className="object-cover hover:brightness-95 transition-all"
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openAt(0)}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-[#2b2b36] shadow-md hover:bg-white transition-colors"
        >
          <Camera className="w-4 h-4" />
          Show all photos
        </button>
      </div>

      <Lightbox
        open={open}
        close={() => setOpen(false)}
        index={index}
        slides={slides}
      />
    </>
  );
}
