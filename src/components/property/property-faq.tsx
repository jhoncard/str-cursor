"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is the check-in and check-out process?",
    answer:
      "We use a smart lock for self check-in. You will receive a unique access code via message on the day of your arrival. Check-in is typically from 4:00 PM and check-out by 11:00 AM. Early check-in or late check-out may be available upon request depending on the booking calendar.",
  },
  {
    question: "Is WiFi available and how fast is it?",
    answer:
      "Yes, high-speed WiFi is included at no extra charge. Our connection is fiber-based and suitable for video calls, streaming, and remote work. The network name and password are provided in the welcome guide upon arrival.",
  },
  {
    question: "Is there parking available?",
    answer:
      "Free parking is available on the premises. The driveway can accommodate up to two standard-sized vehicles. Street parking is also available as an additional option in the surrounding neighborhood.",
  },
  {
    question: "Are pets allowed?",
    answer:
      "Pets are welcome at most of our properties. A pet fee may apply and will be noted in the listing details. We ask that pets are kept off the furniture and that any messes are cleaned up. Please notify us in advance if you plan to bring a pet.",
  },
  {
    question: "What is the cancellation policy?",
    answer:
      "Our standard cancellation policy allows a full refund if you cancel at least 5 days before check-in. Cancellations made within 5 days of check-in are eligible for a 50% refund. Please check the specific listing for any variations to this policy.",
  },
  {
    question: "Can I request an early check-in or late check-out?",
    answer:
      "Early check-in and late check-out can sometimes be arranged depending on the booking schedule. Please message the host at least 48 hours before your arrival to inquire. There may be an additional fee for extended stays beyond the standard times.",
  },
];

export function PropertyFaq() {
  return (
    <section>
      <h2 className="text-2xl font-semibold text-[#2b2b36] mb-6">
        Frequently asked questions
      </h2>
      <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <Accordion>
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="text-[#2b2b36] text-base font-medium py-4 no-underline hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
