"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { PawPrint, X } from "lucide-react";

const PROPERTY_TYPES = [
  { label: "All", value: "" },
  { label: "House", value: "house" },
  { label: "Room", value: "room" },
] as const;

const PRICE_RANGES = [
  { label: "Any", min: "", max: "" },
  { label: "$0–$100", min: "0", max: "100" },
  { label: "$100–$200", min: "100", max: "200" },
  { label: "$200+", min: "200", max: "" },
] as const;

const BED_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
] as const;

const SORT_OPTIONS = [
  { label: "Recommended", value: "" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Rating", value: "rating" },
] as const;

function priceKey(min: string, max: string) {
  return `${min}:${max}`;
}

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type") || "";
  const petFriendly = searchParams.get("pets") === "true";
  const activeMinPrice = searchParams.get("minPrice") || "";
  const activeMaxPrice = searchParams.get("maxPrice") || "";
  const activeMinBeds = searchParams.get("minBeds") || "";
  const activeSort = searchParams.get("sort") || "";

  const activePriceKey = priceKey(activeMinPrice, activeMaxPrice);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      router.push(`/properties?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const hasActiveFilters =
    activeType || petFriendly || activeMinPrice || activeMaxPrice || activeMinBeds || activeSort;

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    ["type", "pets", "minPrice", "maxPrice", "minBeds", "sort"].forEach((k) =>
      params.delete(k),
    );
    router.push(`/properties?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const pill =
    "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer";
  const pillOff =
    "border-gray-200 text-gray-600 bg-white hover:border-[#2b2b36]/30 hover:text-[#2b2b36]";
  const pillOn = "border-[#2b2b36] bg-[#2b2b36] text-white";

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Type
      </span>
      {PROPERTY_TYPES.map((t) => (
        <button
          key={t.label}
          onClick={() => updateParams({ type: t.value })}
          className={`${pill} ${activeType === t.value ? pillOn : pillOff}`}
        >
          {t.label}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <button
        onClick={() => updateParams({ pets: petFriendly ? "" : "true" })}
        className={`${pill} flex items-center gap-1.5 ${petFriendly ? pillOn : pillOff}`}
      >
        <PawPrint className="w-3 h-3" />
        Pet-friendly
      </button>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Price
      </span>
      {PRICE_RANGES.map((p) => (
        <button
          key={p.label}
          onClick={() => updateParams({ minPrice: p.min, maxPrice: p.max })}
          className={`${pill} ${activePriceKey === priceKey(p.min, p.max) ? pillOn : pillOff}`}
        >
          {p.label}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Beds
      </span>
      {BED_OPTIONS.map((b) => (
        <button
          key={b.label}
          onClick={() => updateParams({ minBeds: b.value })}
          className={`${pill} ${activeMinBeds === b.value ? pillOn : pillOff}`}
        >
          {b.label}
        </button>
      ))}

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
        Sort
      </span>
      {SORT_OPTIONS.map((s) => (
        <button
          key={s.label}
          onClick={() => updateParams({ sort: s.value })}
          className={`${pill} ${activeSort === s.value ? pillOn : pillOff}`}
        >
          {s.label}
        </button>
      ))}

      {hasActiveFilters && (
        <>
          <div className="w-px h-5 bg-gray-200 mx-1" />
          <button
            onClick={clearFilters}
            className={`${pill} border-red-200 text-red-500 bg-red-50 hover:bg-red-100 flex items-center gap-1`}
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        </>
      )}
    </div>
  );
}
