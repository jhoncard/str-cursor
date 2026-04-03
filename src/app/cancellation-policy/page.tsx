import type { Metadata } from "next";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "Understand the cancellation and refund policy for Feathers Houses bookings.",
};

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2b2b36] mb-2">
            Cancellation Policy
          </h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: April 1, 2026</p>

          <div className="prose prose-gray max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#2b2b36] [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-gray-600 [&_ul]:mb-4 [&_li]:mb-1">
            <h2>Overview</h2>
            <p>
              At Feathers Houses, we understand that plans can change. We offer a flexible
              cancellation policy designed to give you peace of mind when booking with us.
              Please review the details below to understand how cancellations and refunds
              are handled.
            </p>

            <h2>Flexible Cancellation Terms</h2>
            <p>Our standard cancellation policy applies to most properties:</p>
            <ul className="list-disc pl-6">
              <li>
                <strong>More than 5 days before check-in:</strong> Full refund of the nightly
                rate and cleaning fee. Service fees are non-refundable.
              </li>
              <li>
                <strong>1 to 5 days before check-in:</strong> 50% refund of the nightly rate.
                Cleaning and service fees are non-refundable.
              </li>
              <li>
                <strong>Less than 24 hours before check-in or after check-in:</strong> No
                refund is issued for the nights not stayed.
              </li>
            </ul>

            <h2>How to Cancel</h2>
            <p>
              To cancel a reservation, use the cancellation option within your booking platform
              (e.g., Airbnb) or contact us directly at{" "}
              <a href="mailto:info@feathershouses.com" className="text-[#2b2b36] underline">
                info@feathershouses.com
              </a>
              . Cancellations are effective based on the date and time we receive your request.
            </p>

            <h2>Refund Processing</h2>
            <p>
              Approved refunds are processed through the original payment method. Depending
              on your bank or payment provider, it may take 5 to 10 business days for the
              refund to appear in your account. We will confirm your refund amount and
              estimated timeline via email.
            </p>

            <h2>Modifications to Your Booking</h2>
            <p>
              If you need to change your dates rather than cancel, please contact us as soon
              as possible. We will do our best to accommodate date changes based on
              availability. Modifications are not subject to cancellation fees, provided the
              total stay value remains the same or higher.
            </p>

            <h2>Extenuating Circumstances</h2>
            <p>
              In the event of documented extenuating circumstances — such as natural disasters,
              serious illness, or government-imposed travel restrictions — we will work with
              you on a case-by-case basis to find a fair resolution. This may include a full
              refund, credit toward a future stay, or rescheduling at no additional cost.
            </p>

            <h2>Peak Season and Holiday Bookings</h2>
            <p>
              During peak travel periods (major holidays, spring break, and special events),
              some properties may have a stricter cancellation policy. These terms will be
              clearly displayed on the listing at the time of booking. We encourage you to
              review the specific cancellation terms before confirming your reservation.
            </p>

            <h2>No-Shows</h2>
            <p>
              If you do not arrive for your reservation and do not contact us, no refund will
              be issued. The full booking amount will be charged as scheduled.
            </p>

            <h2>Questions</h2>
            <p>
              If you have any questions about our cancellation policy or need assistance with
              a cancellation, please contact us at{" "}
              <a href="mailto:info@feathershouses.com" className="text-[#2b2b36] underline">
                info@feathershouses.com
              </a>{" "}
              or call (813) 555-0100.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
