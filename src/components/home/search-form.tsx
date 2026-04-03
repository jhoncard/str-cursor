"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDown, MapPin, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DateRange } from "react-day-picker";
import { propertiesData } from "@/data/properties";

const MAX_SEARCH_GUESTS = Math.max(...propertiesData.map((property) => property.maxGuests));

export function SearchForm() {
  const router = useRouter();
  
  // States
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [city, setCity] = useState<string>("Any");
  const [guests, setGuests] = useState<number>(1);
  
  // Popover open states (optional, to manage close on select)
  const [isCityOpen, setIsCityOpen] = useState(false);

  const handleSearch = () => {
    // Navigate to properties page with query parameters
    const params = new URLSearchParams();
    if (city !== "Any") params.append("city", city);
    if (guests > 1) params.append("guests", guests.toString());
    if (date?.from) params.append("checkIn", format(date.from, "yyyy-MM-dd"));
    if (date?.to) params.append("checkOut", format(date.to, "yyyy-MM-dd"));
    
    router.push(`/properties?${params.toString()}`);
  };

  const handleCitySelect = (selectedCity: string) => {
    setCity(selectedCity);
    setIsCityOpen(false);
  };

  return (
    <>
      {/* 1. Travel Period - Date Range Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col gap-1 cursor-pointer group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-xl transition-colors">
            <div className="flex justify-between items-center">
              <span className="text-[#2b2b36] font-semibold text-sm">Travel Period</span>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#2b2b36] transition-colors" />
            </div>
            <span className="text-gray-500 text-sm">
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                "Start Date - End Date"
              )}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[680px] max-w-[calc(100vw-2rem)] p-0 bg-white border border-gray-100 shadow-xl z-50 rounded-2xl overflow-hidden" align="start" sideOffset={8}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      
      <div className="w-full h-[1px] bg-gray-100 my-1"></div>

      {/* 2. Where? - City Selection */}
      <Popover open={isCityOpen} onOpenChange={setIsCityOpen}>
        <PopoverTrigger asChild>
          <div className="flex flex-col gap-1 cursor-pointer group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-xl transition-colors">
            <div className="flex justify-between items-center">
              <span className="text-[#2b2b36] font-semibold text-sm">Where?</span>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#2b2b36] transition-colors" />
            </div>
            <span className="text-gray-500 text-sm">
              {city === "Any" ? "Select a city" : city}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2 flex flex-col gap-1 bg-white border border-gray-100 shadow-xl z-50 rounded-2xl" align="start" sideOffset={8}>
          <button 
            onClick={() => handleCitySelect("Tampa")}
            className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="p-2 bg-gray-100 rounded-md">
              <MapPin className="w-4 h-4 text-[#2b2b36]" />
            </div>
            <span className="text-[#2b2b36] font-medium text-sm">Tampa, FL</span>
          </button>
          <button 
            onClick={() => handleCitySelect("St. Petersburg")}
            className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="p-2 bg-gray-100 rounded-md">
              <MapPin className="w-4 h-4 text-[#2b2b36]" />
            </div>
            <span className="text-[#2b2b36] font-medium text-sm">St. Petersburg, FL</span>
          </button>
          <div className="my-1 h-[1px] w-full bg-gray-100" />
          <button 
            onClick={() => handleCitySelect("Any")}
            className="flex items-center gap-3 w-full p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
          >
            <div className="p-2 bg-gray-100 rounded-md">
              <MapPin className="w-4 h-4 text-[#2b2b36]" />
            </div>
            <span className="text-[#2b2b36] font-medium text-sm">Anywhere</span>
          </button>
        </PopoverContent>
      </Popover>

      <div className="w-full h-[1px] bg-gray-100 my-1"></div>

      {/* 3. Guests - Counter */}
      <Popover>
        <PopoverTrigger asChild>
          <div className="flex flex-col gap-1 cursor-pointer group hover:bg-gray-50 -mx-4 px-4 py-2 rounded-xl transition-colors">
            <div className="flex justify-between items-center">
              <span className="text-[#2b2b36] font-semibold text-sm">Guests</span>
              <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#2b2b36] transition-colors" />
            </div>
            <span className="text-gray-500 text-sm">
              {guests} Guest{guests !== 1 ? 's' : ''}
            </span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-4 bg-white border border-gray-100 shadow-xl z-50 rounded-2xl" align="start" sideOffset={8}>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[#2b2b36] font-semibold text-sm">Guests</span>
              <span className="text-gray-400 text-xs">Ages 2 or above</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-[#2b2b36] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-[#2b2b36] font-medium w-4 text-center">{guests}</span>
              <button 
                onClick={() => setGuests(Math.min(MAX_SEARCH_GUESTS, guests + 1))}
                className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-[#2b2b36] transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Search Button */}
      <button 
        onClick={handleSearch}
        className="w-full py-4 mt-4 rounded-full bg-[#414152] hover:bg-[#2b2b36] text-white font-medium transition-colors shadow-md flex items-center justify-center gap-2"
      >
        Search
      </button>
    </>
  );
}
