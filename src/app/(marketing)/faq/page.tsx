import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about staying at Feathers Houses properties in Tampa Bay.",
};

const faqs = [
  {
    question: "How does the check-in process work?",
    answer:
      "All of our properties offer self check-in via smart locks. After your booking is confirmed, you will receive a detailed arrival guide with your unique door code, parking instructions, WiFi credentials, and step-by-step directions to the property. You can check in at any time after the designated check-in hour without needing to coordinate with anyone.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Our standard policy allows free cancellation up to 5 days before check-in for a full refund. Cancellations made within 5 days of check-in are eligible for a 50% refund of the nightly rate, excluding service and cleaning fees. Please review the specific cancellation terms on your listing before booking, as some properties may have different policies during peak seasons.",
  },
  {
    question: "Are pets allowed at your properties?",
    answer:
      "Many of our properties are pet-friendly. Each listing clearly indicates whether pets are welcome. Where allowed, a modest pet fee may apply to cover additional cleaning. We ask that pets be supervised at all times and not left unattended on furniture or in crates for extended periods. Please contact us before booking if you have questions about specific pet policies.",
  },
  {
    question: "Is parking available?",
    answer:
      "Yes, all of our properties include free parking on premises. Most offer dedicated driveway spaces or private parking areas. Specific parking instructions, including the number of available spots, are included in the arrival guide you receive before check-in.",
  },
  {
    question: "What kind of WiFi can I expect?",
    answer:
      "We provide high-speed WiFi at every property. Our Tampa locations typically offer speeds of 200+ Mbps, making them well-suited for remote work, video calls, and streaming. WiFi network name and password are included in your welcome guide and also posted inside the property.",
  },
  {
    question: "What amenities are included?",
    answer:
      "All properties come fully equipped with essentials including fresh linens, towels, toiletries, a fully stocked kitchen with cookware and utensils, coffee maker, hair dryer, iron, and laundry access. Many properties also feature dedicated workspaces, smart TVs, and outdoor spaces. Check each listing for a complete amenity list.",
  },
  {
    question: "What time is check-in and check-out?",
    answer:
      "Standard check-in time is 4:00 PM and check-out is by 11:00 AM, though this may vary slightly by property. If you need early check-in or late check-out, reach out to us and we will do our best to accommodate based on availability.",
  },
  {
    question: "How do I contact the host during my stay?",
    answer:
      "You can reach us through the Airbnb messaging platform, by email at info@feathershouses.com, or by phone at (813) 555-0100. We monitor all channels and typically respond within one hour. For emergencies, calling is the fastest way to reach us.",
  },
  {
    question: "Are your properties suitable for remote work?",
    answer:
      "Absolutely. Most of our properties include a dedicated workspace with a desk and comfortable chair, high-speed WiFi exceeding 200 Mbps, and quiet neighborhoods that are ideal for focused work. Many guests choose our properties specifically for extended work-from-home stays.",
  },
  {
    question: "Do you offer discounts for longer stays?",
    answer:
      "Yes, we offer weekly and monthly discounts on most properties. The discount is automatically applied when you select dates for 7 nights or longer on the booking platform. For stays exceeding 30 days, please contact us directly to discuss custom rates.",
  },
];

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <div className="text-center mb-10">
          <p className="text-sm font-medium tracking-widest text-[#2b2b36]/50 uppercase mb-3">
            Support
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36] mb-3">
            Frequently Asked Questions
          </h1>
          <p className="text-gray-500 max-w-xl mx-auto">
            Everything you need to know about staying at a Feathers Houses property.
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-3xl p-8 md:p-10 shadow-sm">
          <Accordion>
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={String(index)}>
                <AccordionTrigger className="text-[#2b2b36] text-base py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-gray-600 leading-relaxed pb-2">{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </main>
    </div>
  );
}
