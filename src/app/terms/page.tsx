import type { Metadata } from "next";
import { Header } from "@/components/layout/header";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description:
    "Terms and conditions for using Feathers Houses services and booking properties.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2b2b36] mb-2">
            Terms and Conditions
          </h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: April 1, 2026</p>

          <div className="prose prose-gray max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#2b2b36] [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-gray-600 [&_ul]:mb-4 [&_li]:mb-1">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using the Feathers Houses website and booking our properties,
              you agree to be bound by these Terms and Conditions. If you do not agree to
              these terms, please do not use our services.
            </p>

            <h2>2. Booking and Reservations</h2>
            <p>
              All reservations are subject to availability and confirmation. By completing a
              booking, you agree to pay the total amount as displayed, including nightly rates,
              cleaning fees, and applicable service fees. Prices are listed in US Dollars and
              may vary based on dates, season, and property.
            </p>
            <p>
              You must be at least 18 years old to make a reservation. The person making the
              booking is responsible for ensuring all guests comply with the property&apos;s
              house rules.
            </p>

            <h2>3. Check-In and Check-Out</h2>
            <p>
              Check-in and check-out times vary by property and are specified in your booking
              confirmation. Early check-in or late check-out may be available upon request but
              is not guaranteed. Failure to check out by the designated time may result in
              additional charges.
            </p>

            <h2>4. Guest Conduct</h2>
            <p>
              Guests are expected to treat the property with respect, follow all house rules,
              and behave considerately toward neighbors. Prohibited activities include but are
              not limited to:
            </p>
            <ul className="list-disc pl-6">
              <li>Hosting parties or events without prior written approval</li>
              <li>Exceeding the maximum occupancy listed for the property</li>
              <li>Smoking inside any property</li>
              <li>Engaging in any illegal activity on the premises</li>
              <li>Making excessive noise, especially between 10:00 PM and 8:00 AM</li>
            </ul>

            <h2>5. Property Damage</h2>
            <p>
              Guests are responsible for any damage to the property, furnishings, or equipment
              caused during their stay. Minor wear and tear is expected, but significant damage
              will be assessed and charged accordingly. We may use the security deposit or
              file a claim through the booking platform&apos;s resolution center to cover
              repair or replacement costs.
            </p>

            <h2>6. Cancellations and Refunds</h2>
            <p>
              Cancellation terms are outlined in our Cancellation Policy page and in the
              specific listing details at the time of booking. Refunds are processed through
              the original payment method and may take 5 to 10 business days to appear.
            </p>

            <h2>7. Liability</h2>
            <p>
              Feathers Houses provides properties in good condition and takes reasonable steps
              to ensure guest safety. However, we are not liable for personal injury, loss, or
              damage to personal belongings during your stay. Guests use pools, hot tubs,
              outdoor areas, and all property amenities at their own risk.
            </p>

            <h2>8. Intellectual Property</h2>
            <p>
              All content on the Feathers Houses website, including text, photographs, logos,
              and design elements, is the property of Feathers Houses and is protected by
              copyright law. You may not reproduce, distribute, or use any content without
              prior written permission.
            </p>

            <h2>9. Modifications to Terms</h2>
            <p>
              We reserve the right to update these Terms and Conditions at any time. Changes
              take effect upon posting to this page. Continued use of our services after
              changes are posted constitutes acceptance of the revised terms.
            </p>

            <h2>10. Governing Law</h2>
            <p>
              These terms are governed by and construed in accordance with the laws of the
              State of Florida. Any disputes arising from these terms or your use of our
              services shall be resolved in the courts of Hillsborough County, Florida.
            </p>

            <h2>11. Contact</h2>
            <p>
              For questions about these Terms and Conditions, please reach out to us at{" "}
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
