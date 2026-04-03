import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn about Feathers Houses and our passion for hospitality in the Tampa Bay area.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-16">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-8">
        <section className="bg-white rounded-3xl p-8 md:p-12 lg:p-16 shadow-sm">
          <p className="text-sm font-medium tracking-widest text-[#2b2b36]/50 uppercase mb-3">
            About Us
          </p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-[#2b2b36] leading-tight mb-6">
            Your Home Away From Home<br className="hidden md:block" /> in Tampa Bay
          </h1>
          <div className="w-16 h-[2px] bg-[#2b2b36] mb-8" />

          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            <div>
              <h2 className="text-xl font-semibold text-[#2b2b36] mb-4">Meet Your Host</h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Hi, I&apos;m Jhon — a Superhost with over four years of experience hosting guests
                in the Tampa Bay area. What started as a single listing has grown into a curated
                collection of comfortable, well-appointed properties that I personally oversee.
              </p>
              <p className="text-gray-600 leading-relaxed mb-4">
                Hospitality is more than a business for me; it&apos;s a genuine passion. Every
                property in the Feathers Houses portfolio is designed to feel like a real home,
                not just another rental. From quality linens and fully stocked kitchens to
                detailed local guides, I pay attention to the details that make a stay memorable.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Whether you&apos;re visiting Tampa Bay for work, a family vacation, or a weekend
                getaway, I&apos;m here to make sure your experience is seamless from booking to
                checkout.
              </p>
            </div>

            <div className="bg-[#f4f6f8] rounded-2xl p-8 flex flex-col justify-center">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-3xl font-bold text-[#2b2b36]">4+</p>
                  <p className="text-sm text-gray-500 mt-1">Years Hosting</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#2b2b36]">250+</p>
                  <p className="text-sm text-gray-500 mt-1">Guest Reviews</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#2b2b36]">4.87</p>
                  <p className="text-sm text-gray-500 mt-1">Average Rating</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[#2b2b36]">Superhost</p>
                  <p className="text-sm text-gray-500 mt-1">Status</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl p-8 md:p-12 lg:p-16 shadow-sm mt-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-[#2b2b36] mb-4">Our Mission</h2>
          <div className="w-12 h-[2px] bg-[#2b2b36] mb-6" />
          <p className="text-gray-600 leading-relaxed max-w-3xl mb-4">
            At Feathers Houses, our mission is simple: provide guests with thoughtfully designed
            spaces that combine the comfort of home with the excitement of travel. We believe
            great hospitality means anticipating needs before they arise, maintaining impeccable
            standards, and treating every guest like family.
          </p>
          <p className="text-gray-600 leading-relaxed max-w-3xl">
            We are committed to supporting the local Tampa Bay community by recommending
            neighborhood restaurants, shops, and experiences that help our guests discover
            the area like a local — not a tourist.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-2xl md:text-3xl font-semibold text-[#2b2b36] mb-6">
            Why Choose Us
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Superhost Quality",
                description:
                  "Every property meets Airbnb's highest standards for cleanliness, communication, and guest satisfaction.",
              },
              {
                title: "Local Expertise",
                description:
                  "As Tampa Bay residents, we provide insider tips on the best dining, beaches, and attractions in the area.",
              },
              {
                title: "Self Check-In",
                description:
                  "Smart locks and detailed arrival guides let you check in on your schedule without any hassle.",
              },
              {
                title: "Responsive Support",
                description:
                  "Reach us anytime. We pride ourselves on fast response times and proactive communication.",
              },
              {
                title: "Fully Equipped",
                description:
                  "From high-speed WiFi and dedicated workspaces to stocked kitchens, our homes are ready for any stay.",
              },
              {
                title: "Pet-Friendly Options",
                description:
                  "We understand pets are family too. Many of our properties welcome your four-legged companions.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
              >
                <h3 className="text-lg font-semibold text-[#2b2b36] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-[#2b2b36] rounded-3xl p-8 md:p-12 mt-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-3">
            Ready to Experience Tampa Bay?
          </h2>
          <p className="text-white/70 mb-6 max-w-xl mx-auto">
            Browse our collection of properties and find your perfect stay.
          </p>
          <Link
            href="/properties"
            className="inline-block px-8 py-3 rounded-full border-2 border-white text-white font-medium hover:bg-white hover:text-[#2b2b36] transition-all"
          >
            View Properties
          </Link>
        </section>
      </main>
    </div>
  );
}
