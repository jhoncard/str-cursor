"use client";

import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import type { Property } from "@/data/properties";

const desktopQuery = "(min-width: 1024px)";

function subscribeToDesktop(onChange: () => void) {
  const media = window.matchMedia(desktopQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function isDesktop() {
  return window.matchMedia(desktopQuery).matches;
}

// Dynamically import the Leaflet Map component with no SSR
const DynamicMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse rounded-2xl">
      <div className="w-8 h-8 border-4 border-[#2b2b36] border-t-transparent rounded-full animate-spin"></div>
    </div>
  ),
});

interface MapViewProps {
  properties: Property[];
  hoveredPropertyId?: string | null;
  onPropertySelect?: (slug: string) => void;
}

export function MapView({ properties, hoveredPropertyId, onPropertySelect }: MapViewProps) {
  const showMap = useSyncExternalStore(subscribeToDesktop, isDesktop, () => false);

  if (!showMap) return null;

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden shadow-inner border border-gray-200 z-0">
      <DynamicMap properties={properties} hoveredPropertyId={hoveredPropertyId} onPropertySelect={onPropertySelect} />
    </div>
  );
}
