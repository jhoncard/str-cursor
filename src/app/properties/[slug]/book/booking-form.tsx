"use client";

import { use, useState } from "react";
import { useSearchParams } from "next/navigation";
import { propertiesData } from "@/data/properties";
import Image from "next/image";
import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { Check } from "lucide-react";

function parseDateOrFallback(input: string | null, fallbackIso: string) {
  if (!input) return parseISO(fallbackIso);
  const parsed = parseISO(input);
  return Number.isNaN(parsed.getTime()) ? parseISO(fallbackIso) : parsed;
}

const ARRIVAL_TIMES = [
  "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM",
  "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM", "11:00 PM", "12:00 AM",
];

function StepIndicator({ currentStep }: { currentStep: 1 | 2 }) {
  const steps = [
    { number: 1, label: "Guest Details" },
    { number: 2, label: "Review & Pay" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((step, idx) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step.number < currentStep
                  ? "bg-[#2b2b36] text-white"
                  : step.number === currentStep
                    ? "bg-[#2b2b36] text-white"
                    : "bg-gray-200 text-gray-500"
              }`}
            >
              {step.number < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-xs font-medium ${
                step.number <= currentStep ? "text-[#2b2b36]" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-24 sm:w-32 h-0.5 mx-3 mb-6 transition-colors ${
                currentStep > 1 ? "bg-[#2b2b36]" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function BookingForm({ params }: { params: Promise<{ slug: string }> }) {
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const property = propertiesData.find(p => p.slug === resolvedParams.slug);

  const checkInParam = searchParams.get("checkIn");
  const checkOutParam = searchParams.get("checkOut");
  const guestsParam = searchParams.get("guests");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numGuests, setNumGuests] = useState(() => {
    const parsed = guestsParam ? Number.parseInt(guestsParam, 10) : 1;
    if (!Number.isFinite(parsed)) return 1;
    return Math.max(1, parsed);
  });

  const [specialRequests, setSpecialRequests] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [agreeHouseRules, setAgreeHouseRules] = useState(false);
  const [agreeCancellation, setAgreeCancellation] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [guestInfoComplete, setGuestInfoComplete] = useState(false);

  const allPoliciesAccepted = agreeHouseRules && agreeCancellation && agreeTerms;
  const currentStep: 1 | 2 = guestInfoComplete ? 2 : 1;

  if (!property) {
    return <div>Property not found</div>;
  }

  const checkInDate = parseDateOrFallback(checkInParam, "2026-05-01");
  const checkOutDate = parseDateOrFallback(checkOutParam, "2026-05-06");
  const nights = Math.max(1, differenceInCalendarDays(checkOutDate, checkInDate));
  const subtotal = property.basePriceNight * nights;
  const totalAmount = subtotal + property.cleaningFee + property.serviceFee;

  const checkGuestInfoComplete = (form: HTMLFormElement) => {
    const firstName = (form.elements.namedItem("firstName") as HTMLInputElement)?.value;
    const lastName = (form.elements.namedItem("lastName") as HTMLInputElement)?.value;
    const email = (form.elements.namedItem("email") as HTMLInputElement)?.value;
    const phone = (form.elements.namedItem("phone") as HTMLInputElement)?.value;
    setGuestInfoComplete(
      !!firstName?.trim() && !!lastName?.trim() && !!email?.trim() && !!phone?.trim()
    );
  };

  const handleBooking = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (numGuests > property.maxGuests) {
      setError(`This property allows up to ${property.maxGuests} guests.`);
      setLoading(false);
      return;
    }

    if (!allPoliciesAccepted) {
      setError("Please accept all policies before continuing.");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const data = {
      slug: property.slug,
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      checkIn: format(checkInDate, "yyyy-MM-dd"),
      checkOut: format(checkOutDate, "yyyy-MM-dd"),
      numGuests,
      specialRequests: specialRequests.trim() || undefined,
      arrivalTime: arrivalTime || undefined,
    };

    try {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to start payment.");
        return;
      }

      if (payload.url) {
        window.location.assign(payload.url);
      } else {
        setError("Stripe checkout URL is missing.");
      }
    } catch {
      setError("Failed to start Stripe checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
      <h1 className="text-3xl font-semibold text-[#2b2b36] mb-2">Confirm your booking</h1>

      <StepIndicator currentStep={currentStep} />

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <form
            onSubmit={handleBooking}
            onChange={(e) => checkGuestInfoComplete(e.currentTarget)}
            className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col gap-6"
          >
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <div>
              <h2 className="text-xl font-semibold text-[#2b2b36] mb-4">Your Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">First Name</label>
                  <input name="firstName" required className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all" placeholder="John" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Last Name</label>
                  <input name="lastName" required className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all" placeholder="Doe" />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Email Address</label>
                  <input name="email" type="email" required className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all" placeholder="john@example.com" />
                </div>
                <div className="col-span-2 flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Phone Number</label>
                  <input name="phone" type="tel" required className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div>
              <h2 className="text-xl font-semibold text-[#2b2b36] mb-4">Trip Details</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Guests (max {property.maxGuests})</label>
                  <input
                    name="numGuests"
                    type="number"
                    min={1}
                    max={property.maxGuests}
                    value={numGuests}
                    onChange={(e) => {
                      const value = Number.parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) return;
                      setNumGuests(Math.min(property.maxGuests, Math.max(1, value)));
                    }}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Estimated Arrival Time</label>
                  <select
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all text-[#2b2b36]"
                  >
                    <option value="">Select arrival time (optional)</option>
                    {ARRIVAL_TIMES.map((time) => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[#2b2b36]">Special Requests <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#2b2b36]/20 focus:border-[#2b2b36] transition-all resize-none"
                    placeholder="Early check-in, extra towels, etc."
                  />
                </div>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="bg-[#f4f6f8] border border-gray-200 rounded-2xl p-4 text-sm text-gray-600">
              Secure payment is handled by Stripe Checkout. You will enter card details on the Stripe hosted page.
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-semibold text-[#2b2b36] mb-1">Policies</h2>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeHouseRules}
                  onChange={(e) => setAgreeHouseRules(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#2b2b36] focus:ring-[#2b2b36]/20 accent-[#2b2b36] cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/house-rules" target="_blank" className="underline text-[#2b2b36] font-medium hover:text-[#414152]">
                    House Rules
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeCancellation}
                  onChange={(e) => setAgreeCancellation(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#2b2b36] focus:ring-[#2b2b36]/20 accent-[#2b2b36] cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/cancellation-policy" target="_blank" className="underline text-[#2b2b36] font-medium hover:text-[#414152]">
                    Cancellation Policy
                  </Link>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-5 w-5 rounded border-gray-300 text-[#2b2b36] focus:ring-[#2b2b36]/20 accent-[#2b2b36] cursor-pointer"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" className="underline text-[#2b2b36] font-medium hover:text-[#414152]">
                    Terms and Conditions
                  </Link>
                </span>
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading || !allPoliciesAccepted}
                className="w-full py-4 rounded-full bg-[#414152] hover:bg-[#2b2b36] text-white font-medium transition-colors shadow-md text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Redirecting to Stripe..." : `Continue to payment \u2014 $${totalAmount}`}
              </button>
              {!allPoliciesAccepted && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Please accept all policies above to continue
                </p>
              )}
            </div>
          </form>
        </div>

        <div className="w-full lg:w-[400px]">
          <div className="sticky top-8 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <Image src={property.images[0]} alt={property.name} width={100} height={100} className="rounded-xl object-cover h-[100px]" />
              <div className="flex flex-col">
                <span className="text-xs text-gray-500 font-medium mb-1">{property.propertyType.replace("_", " ").toUpperCase()}</span>
                <span className="font-semibold text-[#2b2b36] leading-tight">{property.name}</span>
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center text-[#2b2b36]">
                <span className="font-medium">Check-in</span>
                <span className="text-gray-600">{format(checkInDate, "EEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between items-center text-[#2b2b36]">
                <span className="font-medium">Check-out</span>
                <span className="text-gray-600">{format(checkOutDate, "EEE, MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between items-center text-[#2b2b36]">
                <span className="font-medium">Duration</span>
                <span className="text-gray-600">{nights} night{nights > 1 ? "s" : ""}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[#2b2b36]">
              <span className="font-medium">Guests</span>
              <span className="text-gray-600">{numGuests} Guest{numGuests > 1 ? "s" : ""}</span>
            </div>

            <hr className="border-gray-100" />

            <div className="flex flex-col gap-3 text-sm font-medium text-gray-600">
              <div className="flex justify-between items-center">
                <span>${property.basePriceNight} x {nights} night{nights > 1 ? "s" : ""}</span>
                <span>${subtotal}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Cleaning fee</span>
                <span>${property.cleaningFee}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Service fee</span>
                <span>${property.serviceFee}</span>
              </div>
              <div className="flex justify-between items-center text-[#2b2b36] font-bold text-lg pt-4 border-t border-gray-100">
                <span>Total (USD)</span>
                <span>${totalAmount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
