"use client";

import * as React from "react";
import {
  DayButton,
  getDefaultClassNames,
  type Locale,
} from "react-day-picker";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof DayButton> & {
  locale?: Partial<Locale>;
  nightlyPrices?: Record<string, number>;
  basePriceNight: number;
};

/**
 * Day cell with nightly rate under the date (guest booking calendar).
 */
export function BookingCalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  nightlyPrices,
  basePriceNight,
  children: _ignored,
  ...props
}: Props) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const key = format(day.date, "yyyy-MM-dd");
  const raw = nightlyPrices?.[key];
  const price = raw != null && raw > 0 ? raw : basePriceNight;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      type="button"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex h-auto min-h-[3rem] w-full min-w-[var(--cell-size)] flex-col justify-center gap-0.5 border-0 py-1 text-[0.95rem] font-medium leading-none group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-[var(--cell-radius)] data-[range-end=true]:rounded-r-[var(--cell-radius)] data-[range-end=true]:bg-[#2b2b36] data-[range-end=true]:text-white data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-[var(--range-middle-bg)] data-[range-middle=true]:text-[#1f2430] data-[range-middle=true]:font-semibold data-[range-start=true]:rounded-[var(--cell-radius)] data-[range-start=true]:rounded-l-[var(--cell-radius)] data-[range-start=true]:bg-[#2b2b36] data-[range-start=true]:text-white data-[selected-single=true]:bg-[#2b2b36] data-[selected-single=true]:text-white dark:hover:text-foreground",
        defaultClassNames.day,
        className
      )}
      {...props}
    >
      <span className="text-[0.95rem] font-medium leading-none">{day.date.getDate()}</span>
      <span
        className={cn(
          "text-[10px] font-semibold leading-none",
          modifiers.disabled && "text-muted-foreground",
          !modifiers.disabled && "text-emerald-800",
          (modifiers.range_start || modifiers.range_end) && "text-white",
          modifiers.range_middle && "text-[#1f2430]"
        )}
      >
        ${Math.round(price)}
      </span>
    </Button>
  );
}
