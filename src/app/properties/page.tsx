import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import PropertiesPageClient from "./properties-content";

export const metadata: Metadata = {
  title: "Browse Properties",
  description:
    "Browse premium vacation rental properties in Tampa and St. Petersburg, Florida. Pet-friendly, Superhost quality short-term rentals with direct booking savings.",
  openGraph: {
    title: "Browse Properties | Feathers Houses",
    description:
      "Browse premium vacation rental properties in Tampa and St. Petersburg, Florida. Pet-friendly, Superhost quality short-term rentals.",
  },
};

export default function PropertiesPage() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans flex flex-col h-screen overflow-hidden">
      <div className="shrink-0 bg-white shadow-sm z-10 relative">
        <Header />
      </div>
      <PropertiesPageClient />
    </div>
  );
}
