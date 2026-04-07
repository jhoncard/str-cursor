"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { enUS } from "date-fns/locale";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { DateRange, DayButton as RdpDayButton } from "react-day-picker";

import { BookingCalendarDayButton } from "@/components/property/booking-calendar-day-button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface PropertyDetailBookingCardProps {
  slug: string;
  basePriceNight: number;
  cleaningFee: number;
  serviceFee: number;
  maxGuests: number;
  /** yyyy-MM-dd nights unavailable (booked / iCal import / manual block). */
  blockedDateStrings?: string[];
  /** yyyy-MM-dd → nightly rate (from DB; optional). */
  nightlyPrices?: Record<string, number>;
}

export function PropertyDetailBookingCard({
  slug,
  basePriceNight,
  cleaningFee,
  serviceFee,
  maxGuests,
  blockedDateStrings = [],
  nightlyPrices,
}: PropertyDetailBookingCardProps) {
  const router = useRouter();
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [guests, setGuests] = useState(1);
  const [priceQuote, setPriceQuote] = useState<{
    accommodationSubtotal: number;
    total: number;
    nights: number;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const blockedSet = useMemo(
    () => new Set(blockedDateStrings),
    [blockedDateStrings]
  );

  const nights = useMemo(() => {
    if (!date?.from || !date?.to) return 5;
    return Math.max(1, differenceInCalendarDays(date.to, date.from));
  }, [date]);

  const dayButtonComponent = useMemo(() => {
    function PropertyBookingDayButton(
      props: React.ComponentProps<typeof RdpDayButton>
    ) {
      return (
        <BookingCalendarDayButton
          {...props}
          nightlyPrices={nightlyPrices}
          basePriceNight={basePriceNight}
        />
      );
    }
    PropertyBookingDayButton.displayName = "PropertyBookingDayButton";
    return PropertyBookingDayButton;
  }, [nightlyPrices, basePriceNight]);

  const quoteRangeKey = useMemo(() => {
    if (!date?.from || !date?.to) return "";
    return `${format(date.from, "yyyy-MM-dd")}_${format(date.to, "yyyy-MM-dd")}`;
  }, [date?.from, date?.to]);

  useEffect(() => {
    if (!quoteRangeKey) {
      setPriceQuote(null);
      setQuoteLoading(false);
      return;
    }
    const [checkIn, checkOut] = quoteRangeKey.split("_");
    const ac = new AbortController();
    const timeoutId = window.setTimeout(() => ac.abort(), 30_000);
    let cancelled = false;
    setQuoteLoading(true);
    fetch(
      `/api/properties/${slug}/quote?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`,
      { signal: ac.signal }
    )
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setPriceQuote(null);
          return;
        }
        setPriceQuote({
          accommodationSubtotal: data.accommodationSubtotal,
          total: data.total,
          nights: data.nights,
        });
      })
      .catch(() => {
        if (!cancelled) setPriceQuote(null);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
      ac.abort();
      window.clearTimeout(timeoutId);
    };
  }, [slug, quoteRangeKey]);

  const displayNights = priceQuote?.nights ?? nights;
  const accommodationTotal =
    priceQuote?.accommodationSubtotal ?? basePriceNight * nights;
  const total =
    priceQuote?.total ?? basePriceNight * nights + cleaningFee + serviceFee;

  const handleCalendarOpenChange = (open: boolean) => {
    if (open) {
      setPendingRange(date);
    }
    setCalendarOpen(open);
  };

  const handleAcceptDates = () => {
    if (pendingRange?.from && pendingRange?.to) {
      setDate(pendingRange);
      setCalendarOpen(false);
    }
  };

  const handleReserve = () => {
    if (!date?.from || !date?.to) return;

    const params = new URLSearchParams({
      checkIn: format(date.from, "yyyy-MM-dd"),
      checkOut: format(date.to, "yyyy-MM-dd"),
      guests: guests.toString(),
    });

    router.push(`/properties/${slug}/book?${params.toString()}`);
  };

  const canAccept =
    Boolean(pendingRange?.from) && Boolean(pendingRange?.to);

  return (
    <div className="sticky top-8 bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] border border-gray-100 flex flex-col gap-6">
      <div className="flex items-end gap-1">
        <span className="text-3xl font-semibold text-[#2b2b36]">${basePriceNight}</span>
        <span className="text-gray-500 text-sm mb-1 font-medium">/ night</span>
      </div>

      <div className="flex flex-col gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
        <Popover open={calendarOpen} onOpenChange={handleCalendarOpenChange}>
          <PopoverTrigger asChild>
            <div
              className="flex bg-white divide-x divide-gray-200 text-sm cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  (event.currentTarget as HTMLDivElement).click();
                }
              }}
            >
              <div className="flex-1 py-3.5 px-4 text-left">
                <span className="block text-[10px] uppercase font-bold text-[#2b2b36]">Check-in</span>
                <span className="text-gray-600 font-medium">
                  {date?.from ? format(date.from, "LLL dd, y") : "Add date"}
                </span>
              </div>
              <div className="flex-1 py-3.5 px-4 text-left">
                <span className="block text-[10px] uppercase font-bold text-[#2b2b36]">Check-out</span>
                <span className="text-gray-600 font-medium">
                  {date?.to ? format(date.to, "LLL dd, y") : "Add date"}
                </span>
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[720px] max-w-[calc(100vw-2rem)] p-0 bg-white border border-gray-100 shadow-xl z-50 rounded-2xl overflow-hidden flex flex-col"
            align="end"
            sideOffset={8}
          >
            <div className="[--cell-size:3rem] p-3 pb-0">
              <Calendar
                locale={enUS}
                initialFocus
                mode="range"
                defaultMonth={pendingRange?.from ?? date?.from ?? new Date()}
                selected={pendingRange}
                onSelect={setPendingRange}
                numberOfMonths={2}
                components={{
                  DayButton: dayButtonComponent,
                }}
                disabled={(day) => {
                  if (day < addDays(new Date(), -1)) return true;
                  return blockedSet.has(format(day, "yyyy-MM-dd"));
                }}
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-[#f8f9fb] px-4 py-3">
              <button
                type="button"
                onClick={() => setCalendarOpen(false)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-[#2b2b36] hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAccept}
                onClick={handleAcceptDates}
                className="rounded-full bg-[#414152] px-5 py-2 text-sm font-medium text-white hover:bg-[#2b2b36] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Accept dates
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <div
              className="w-full bg-white py-3.5 px-4 text-left flex justify-between items-center cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  (event.currentTarget as HTMLDivElement).click();
                }
              }}
            >
              <div>
                <span className="block text-[10px] uppercase font-bold text-[#2b2b36]">Guests</span>
                <span className="text-gray-600 font-medium">
                  {guests} guest{guests > 1 ? "s" : ""} (max {maxGuests})
                </span>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-4 bg-white border border-gray-100 shadow-xl z-50 rounded-2xl" align="end" sideOffset={8}>
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[#2b2b36] font-semibold text-sm">Guests</span>
                <span className="text-gray-400 text-xs">Ages 2 or above</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setGuests((current) => Math.max(1, current - 1))}
                  disabled={guests <= 1}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-[#2b2b36] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-[#2b2b36] font-medium w-5 text-center">{guests}</span>
                <button
                  type="button"
                  onClick={() => setGuests((current) => Math.min(maxGuests, current + 1))}
                  className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:border-gray-300 hover:text-[#2b2b36] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <button
        type="button"
        onClick={handleReserve}
        disabled={!date?.from || !date?.to}
        className="w-full text-center py-4 rounded-full bg-[#414152] hover:bg-[#2b2b36] text-white font-medium transition-colors shadow-md text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Reserve
      </button>

      <p className="text-center text-gray-500 text-sm">You won&apos;t be charged yet</p>

      <div className="flex flex-col gap-4 text-sm font-medium text-gray-600 border-t border-gray-100 pt-6">
        <div className="flex justify-between items-center">
          <span className="underline underline-offset-2">
            Accommodation x {displayNights} night{displayNights !== 1 ? "s" : ""}
          </span>
          <span>
            {quoteLoading ? "…" : `$${accommodationTotal}`}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="underline underline-offset-2">Cleaning fee</span>
          <span>${cleaningFee}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="underline underline-offset-2">Service fee</span>
          <span>${serviceFee}</span>
        </div>
        <div className="flex justify-between items-center text-[#2b2b36] font-bold text-lg pt-4 border-t border-gray-100">
          <span>Total before taxes</span>
          <span>{quoteLoading ? "…" : `$${total}`}</span>
        </div>
      </div>
    </div>
  );
}
