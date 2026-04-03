"use client";

interface MobileBookingBarProps {
  basePriceNight: number;
}

export function MobileBookingBar({ basePriceNight }: MobileBookingBarProps) {
  const scrollToBooking = () => {
    const el = document.getElementById("booking-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div>
          <span className="text-lg font-semibold text-[#2b2b36]">
            ${basePriceNight}
          </span>
          <span className="text-sm text-gray-500 ml-1">/ night</span>
        </div>
        <button
          type="button"
          onClick={scrollToBooking}
          className="px-6 py-3 bg-[#2b2b36] text-white font-medium rounded-full hover:bg-[#414152] transition-colors text-sm"
        >
          Check Availability
        </button>
      </div>
    </div>
  );
}
