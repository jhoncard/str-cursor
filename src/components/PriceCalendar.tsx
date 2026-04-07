"use client";

import { useMemo, useState } from "react";
import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, startOfMonth } from "date-fns";

import { cn } from "@/lib/utils";

import type { ListingDailyRate } from "@/lib/pricelabs/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

type PriceCalendarProps = {
  rates: ListingDailyRate[];
};

export function PriceCalendar({ rates }: PriceCalendarProps) {
  const rateMap = useMemo(() => {
    const m = new Map<string, ListingDailyRate>();
    for (const r of rates) {
      m.set(r.date.slice(0, 10), r);
    }
    return m;
  }, [rates]);

  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const startPadding = getDay(startOfMonth(cursor));

  const fmtMoney = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }),
    []
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#2b2b36] hover:bg-gray-50"
          onClick={() => setCursor((d) => addMonths(d, -1))}
        >
          Prev
        </button>
        <h2 className="text-lg font-semibold text-[#2b2b36]">{format(cursor, "MMMM yyyy")}</h2>
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-[#2b2b36] hover:bg-gray-50"
          onClick={() => setCursor((d) => addMonths(d, 1))}
        >
          Next
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500">
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[56px]" aria-hidden />
        ))}
        {monthDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const r = rateMap.get(key);
          const showUnavailable = r && !r.available;
          const showAvailable = r && r.available;

          return (
            <div
              key={key}
              className={cn(
                "flex min-h-[56px] flex-col items-center justify-center rounded-lg border p-1 text-xs",
                !r && "border-gray-100 bg-gray-50 text-gray-400",
                showUnavailable && "border-gray-200 bg-gray-100 text-gray-500",
                showAvailable && "border-emerald-200 bg-emerald-50 text-emerald-950"
              )}
            >
              <span className="font-medium">{format(day, "d")}</span>
              {showAvailable && (
                <span className="mt-0.5 text-[11px] font-semibold leading-tight">
                  {fmtMoney.format(r.price)}
                </span>
              )}
              {showUnavailable && <span className="text-[10px] text-gray-500">Unavailable</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
