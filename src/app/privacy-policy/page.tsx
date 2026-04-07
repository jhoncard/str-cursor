import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import {
  SITE_CONTACT_EMAIL,
  SITE_CONTACT_PHONE_DISPLAY,
} from "@/lib/site-contact";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Learn how Feathers Houses collects, uses, and protects your personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-12 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-semibold text-[#2b2b36] mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-400 mb-8">Last updated: April 1, 2026</p>

          <div className="prose prose-gray max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-[#2b2b36] [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:text-gray-600 [&_p]:leading-relaxed [&_p]:mb-4 [&_ul]:text-gray-600 [&_ul]:mb-4 [&_li]:mb-1">
            <h2>1. Information We Collect</h2>
            <p>
              When you book a property, contact us, or browse our website, we may collect
              the following information:
            </p>
            <ul className="list-disc pl-6">
              <li>Name, email address, and phone number</li>
              <li>Booking details including dates, property selected, and guest count</li>
              <li>Payment information processed through our secure booking partners</li>
              <li>Communications you send to us via email, phone, or contact forms</li>
              <li>Device and browser information collected automatically through cookies</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6">
              <li>Process and manage your reservations</li>
              <li>Communicate with you about your booking, including confirmations and check-in instructions</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Improve our properties, services, and website experience</li>
              <li>Send occasional updates about our properties, with your consent</li>
            </ul>

            <h2>3. Information Sharing</h2>
            <p>
              We do not sell your personal information to third parties. We may share your
              information with trusted service providers who assist us in operating our
              business, such as:
            </p>
            <ul className="list-disc pl-6">
              <li>Booking platforms (e.g., Airbnb) to facilitate your reservation</li>
              <li>Payment processors to handle transactions securely</li>
              <li>Property management tools used to coordinate your stay</li>
              <li>Legal or regulatory authorities when required by law</li>
            </ul>

            <h2>4. Cookies and Tracking</h2>
            <p>
              Our website uses cookies and similar technologies to enhance your browsing
              experience. Cookies help us understand how visitors use our site, remember
              your preferences, and improve our services. You can manage cookie preferences
              through your browser settings. Disabling cookies may affect some website
              functionality.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement reasonable technical and organizational measures to protect your
              personal information against unauthorized access, alteration, disclosure, or
              destruction. However, no method of transmission over the internet is 100%
              secure, and we cannot guarantee absolute security.
            </p>

            <h2>6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate information</li>
              <li>Request deletion of your personal data</li>
              <li>Opt out of marketing communications at any time</li>
              <li>Lodge a complaint with a data protection authority</li>
            </ul>

            <h2>7. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party sites such as Airbnb, Google Maps,
              and social media platforms. We are not responsible for the privacy practices of
              these external sites and encourage you to review their policies.
            </p>

            <h2>8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will
              revise the &ldquo;Last updated&rdquo; date at the top of this page. We encourage
              you to review this page periodically.
            </p>

            <h2>9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how we handle your data,
              please contact us at{" "}
              <a
                href={`mailto:${SITE_CONTACT_EMAIL}`}
                className="text-[#2b2b36] underline"
              >
                {SITE_CONTACT_EMAIL}
              </a>{" "}
              or call us at {SITE_CONTACT_PHONE_DISPLAY}.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
