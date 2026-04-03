"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  Mail,
  KeyRound,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { format, parseISO, differenceInCalendarDays } from "date-fns";

interface SessionData {
  id: string;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  customerEmail: string | null;
  metadata: Record<string, string>;
  confirmationCode: string | null;
}

export default function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "paid" | "unpaid" | "error">("loading");
  const [message, setMessage] = useState("Checking your payment status...");
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setStatus("error");
        setMessage("Missing Stripe session ID.");
        return;
      }

      try {
        const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
        const payload: SessionData = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage("Unable to load payment status.");
          return;
        }

        setSessionData(payload);

        if (payload.paymentStatus === "paid") {
          setStatus("paid");
          setMessage(
            payload.confirmationCode
              ? "Your payment and booking are confirmed."
              : "Your payment was processed. Booking confirmation is syncing..."
          );
        } else {
          setStatus("unpaid");
          setMessage("Payment is still pending. Please wait a moment and refresh.");
        }
      } catch {
        setStatus("error");
        setMessage("Unable to load Stripe confirmation.");
      }
    };

    fetchSession();
  }, [sessionId]);

  const meta = sessionData?.metadata ?? {};
  const checkIn = meta.checkIn ? parseISO(meta.checkIn) : null;
  const checkOut = meta.checkOut ? parseISO(meta.checkOut) : null;
  const nights = checkIn && checkOut ? Math.max(1, differenceInCalendarDays(checkOut, checkIn)) : null;
  const totalPaid = sessionData?.amountTotal
    ? `$${(sessionData.amountTotal / 100).toFixed(2)}`
    : null;

  return (
    <main className="flex-1 flex flex-col items-center p-4 mt-8">
      <div className="max-w-2xl w-full flex flex-col gap-6">

        <div className="bg-white rounded-[2rem] p-10 shadow-sm border border-gray-100 flex flex-col items-center text-center gap-4">
          {status === "loading" && (
            <div className="w-20 h-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          )}
          {status === "paid" && (
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          )}
          {(status === "unpaid" || status === "error") && (
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          <h1 className="text-3xl font-semibold text-[#2b2b36]">
            {status === "paid" ? "Booking Confirmed!" : "Payment Status"}
          </h1>
          <p className="text-gray-500 max-w-sm">{message}</p>

          {sessionData?.confirmationCode && (
            <div className="bg-[#f4f6f8] w-full max-w-sm p-5 rounded-2xl border border-gray-200 mt-2">
              <span className="block text-sm text-gray-500 mb-1">Confirmation Code</span>
              <span className="text-2xl font-mono font-bold text-[#2b2b36] tracking-widest">
                {sessionData.confirmationCode}
              </span>
            </div>
          )}
        </div>

        {status === "paid" && sessionData && (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col gap-6">
            <h2 className="text-xl font-semibold text-[#2b2b36]">Reservation Summary</h2>

            <div className="flex items-start gap-4">
              {meta.propertyImage && (
                <Image
                  src={meta.propertyImage}
                  alt={meta.propertyName || "Property"}
                  width={100}
                  height={100}
                  className="rounded-xl object-cover h-[100px] flex-shrink-0"
                />
              )}
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-[#2b2b36] leading-tight text-lg">
                  {meta.propertyName || "Your Property"}
                </span>
                {meta.numGuests && (
                  <span className="text-sm text-gray-500">
                    {meta.numGuests} Guest{Number(meta.numGuests) > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <hr className="border-gray-100" />

            <div className="grid grid-cols-2 gap-4 text-sm">
              {checkIn && (
                <div>
                  <span className="block text-gray-500 mb-0.5">Check-in</span>
                  <span className="font-medium text-[#2b2b36]">{format(checkIn, "EEE, MMM d, yyyy")}</span>
                </div>
              )}
              {checkOut && (
                <div>
                  <span className="block text-gray-500 mb-0.5">Check-out</span>
                  <span className="font-medium text-[#2b2b36]">{format(checkOut, "EEE, MMM d, yyyy")}</span>
                </div>
              )}
              {nights && (
                <div>
                  <span className="block text-gray-500 mb-0.5">Duration</span>
                  <span className="font-medium text-[#2b2b36]">{nights} night{nights > 1 ? "s" : ""}</span>
                </div>
              )}
              {totalPaid && (
                <div>
                  <span className="block text-gray-500 mb-0.5">Total Paid</span>
                  <span className="font-semibold text-[#2b2b36] text-lg">{totalPaid}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {status === "paid" && (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100 flex flex-col gap-5">
            <h2 className="text-xl font-semibold text-[#2b2b36]">What&apos;s Next</h2>

            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="font-medium text-[#2b2b36]">Check your email</p>
                  <p className="text-sm text-gray-500">A confirmation with your booking details has been sent to your email address.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center flex-shrink-0">
                  <KeyRound className="w-5 h-5 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="font-medium text-[#2b2b36]">Self check-in instructions</p>
                  <p className="text-sm text-gray-500">You will receive check-in instructions 24 hours before your arrival.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#f4f6f8] flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-[#2b2b36]" />
                </div>
                <div>
                  <p className="font-medium text-[#2b2b36]">Have questions?</p>
                  <p className="text-sm text-gray-500">Contact your host if you need anything before or during your stay.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4">
          {status === "paid" && meta.propertySlug && (
            <Link
              href={`/properties/${meta.propertySlug}`}
              className="flex-1 py-4 rounded-full border-2 border-[#2b2b36] text-[#2b2b36] font-medium hover:bg-[#2b2b36] hover:text-white transition-colors text-center"
            >
              Contact Host
            </Link>
          )}
          <Link
            href="/properties"
            className="flex-1 py-4 rounded-full bg-[#414152] hover:bg-[#2b2b36] text-white font-medium transition-colors shadow-md text-center flex items-center justify-center gap-2"
          >
            Browse More Properties
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </main>
  );
}
