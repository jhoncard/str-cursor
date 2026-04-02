"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import Link from "next/link";

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [status, setStatus] = useState<"loading" | "paid" | "unpaid" | "error">("loading");
  const [message, setMessage] = useState("Checking your payment status...");
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!sessionId) {
        setStatus("error");
        setMessage("Missing Stripe session ID.");
        return;
      }

      try {
        const response = await fetch(`/api/stripe/session?session_id=${sessionId}`);
        const payload = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(payload.error || "Unable to load payment status.");
          return;
        }

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

        setPaymentCode(payload.id);
        setConfirmationCode(payload.confirmationCode ?? null);
      } catch {
        setStatus("error");
        setMessage("Unable to load Stripe confirmation.");
      }
    };

    fetchSession();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-[2rem] p-10 shadow-lg border border-gray-100 flex flex-col items-center text-center gap-6">
          {status === "loading" && (
            <div className="w-20 h-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-2">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          )}
          {status === "paid" && (
            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>
          )}
          {(status === "unpaid" || status === "error") && (
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-2">
              <XCircle className="w-10 h-10" />
            </div>
          )}

          <h1 className="text-3xl font-semibold text-[#2b2b36]">
            {status === "paid" ? "Payment Confirmed!" : "Payment Status"}
          </h1>
          <p className="text-gray-500">{message}</p>

          <div className="bg-[#f4f6f8] w-full p-4 rounded-xl border border-gray-200 mt-2">
            <span className="block text-sm text-gray-500 mb-1">Stripe Session</span>
            <span className="text-sm font-mono font-bold text-[#2b2b36] break-all">
              {paymentCode || "PENDING"}
            </span>
          </div>
          <div className="bg-[#f4f6f8] w-full p-4 rounded-xl border border-gray-200 mt-2">
            <span className="block text-sm text-gray-500 mb-1">Booking Confirmation</span>
            <span className="text-xl font-mono font-bold text-[#2b2b36] tracking-widest">
              {confirmationCode || "PENDING"}
            </span>
          </div>

          <Link href="/properties" className="w-full mt-4 py-4 rounded-full border border-gray-200 text-[#2b2b36] font-medium hover:bg-gray-50 transition-colors shadow-sm block">
            Browse More Properties
          </Link>
        </div>
      </main>
    </div>
  );
}
