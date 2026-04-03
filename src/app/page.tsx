import { Header } from "@/components/layout/header";
import { SearchForm } from "@/components/home/search-form";
import { OtaBanner } from "@/components/home/ota-banner";
import { ValueProps } from "@/components/home/value-props";
import { ReviewsCarousel } from "@/components/home/reviews-carousel";
import { TrustSignals } from "@/components/home/trust-signals";
import { WhyBookDirect } from "@/components/home/why-book-direct";
import { LodgingBusinessJsonLd } from "@/components/seo/json-ld";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-12">
      <LodgingBusinessJsonLd />
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-2">
        {/* Hero Section */}
        <div className="relative w-full h-[550px] lg:h-[650px]">
          
          {/* Main Image Container */}
          <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden bg-gray-900 shadow-xl">
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2500&auto=format&fit=crop')] bg-cover bg-center opacity-80 mix-blend-overlay" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
            
            {/* Hero Text Content */}
            <div className="absolute top-1/2 -translate-y-1/2 left-8 md:left-16 lg:left-24 max-w-xl z-10">
              <p className="text-white/90 text-sm md:text-base font-medium tracking-wide mb-4">
                Short-Term Rental Management
              </p>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] tracking-tight mb-8">
                An ideal stay just<br />a click away
              </h1>
              <button className="px-8 py-3.5 rounded-full border-2 border-white text-white font-medium hover:bg-white hover:text-[#2b2b36] transition-all backdrop-blur-sm">
                Book Now
              </button>
            </div>
          </div>

          {/* White Cutout / Search Form Container */}
          <div className="absolute bottom-0 right-0 w-full md:w-[380px] lg:w-[420px] bg-[#f4f6f8] rounded-tl-[2.5rem] pt-6 pl-6 inverted-corner-tr inverted-corner-bl hidden md:block">
            <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-6">
              <SearchForm />
            </div>
          </div>
          
        </div>

        {/* Mobile Search Form */}
        <div className="md:hidden mt-6 bg-white rounded-[2rem] p-6 shadow-sm flex flex-col gap-5">
           <SearchForm />
        </div>

        <ValueProps />
        <OtaBanner />
        <ReviewsCarousel />
        <TrustSignals />
        <WhyBookDirect />

      </main>
    </div>
  );
}
