import { X, Heart, CheckCircle2, Phone } from "lucide-react";
import { SITE_CONTACT_PHONE_DISPLAY } from "@/lib/site-contact";

export function PropertyModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[1000px] max-h-[90vh] overflow-y-auto bg-[#2a2a2a]/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl custom-scrollbar flex flex-col">
        
        {/* Top Image Hero */}
        <div className="relative w-full h-[300px] sm:h-[400px] shrink-0 bg-gray-800">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center" />
          
          <button className="absolute top-4 left-4 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors z-10 text-white">
            <X className="w-5 h-5" />
          </button>

          <button className="absolute top-4 right-4 p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-colors z-10 text-white">
            <Heart className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8 flex flex-col md:flex-row gap-8">
          
          {/* Left Column */}
          <div className="flex-1 flex flex-col gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
                The GoodWynn at Town Brookhaven by ARIUM #248
              </h1>
              <p className="text-white/60 text-sm mt-2 flex items-center gap-1">
                333 Harrison Street, San Francisco, CA 94114 →
              </p>
            </div>

            {/* Quick Facts */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 text-sm text-white/80">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                2 Bed
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                2 Bath
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                740 sq ft
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                Balcony
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Pet Friendly
              </div>
              <div className="flex items-center gap-2 text-white/50">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                Parking Available <span className="text-xs">(+$125/mo)</span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-white/70">
              When you arrive in one of our apartments, you will notice the modern trends throughout your new home. From the open floorplan to the high-end appliances, these exclusive furnishings are specifically selected for your layout to fulfill your needs. Additionally, before your move-in, our hosts will check off... <button className="text-white font-medium hover:underline">Read More</button>
            </p>

            <div className="text-sm font-medium text-white/90 flex items-center gap-2 mt-2">
              Questions? Give Us A Call <Phone className="w-4 h-4 ml-2" />{" "}
              {SITE_CONTACT_PHONE_DISPLAY}
            </div>

            {/* Benefits */}
            <div className="mt-4 border-t border-white/10 pt-6">
              <h3 className="text-white font-semibold mb-4">Landing Premier Benefits</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/70">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white/50" /> Flexible 2 week transfer notice
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white/50" /> 7 free travel days every year
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white/50" /> Renter&apos;s Insurance included
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-white/50" /> No service fee
                </div>
              </div>
              <button className="mt-6 px-4 py-2 rounded-lg border border-white/20 text-white/90 text-sm hover:bg-white/5 transition-colors">
                Learn More
              </button>
            </div>
          </div>

          {/* Right Column: Pricing Card */}
          <div className="w-full md:w-[320px] shrink-0">
            <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 shadow-xl sticky top-8">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-semibold text-white">$2,403</span>
                <span className="text-white/50 text-sm mb-1">/month</span>
              </div>

              {/* Date & Guest Picker Mock */}
              <div className="flex bg-[#2a2a2a] rounded-lg border border-white/10 overflow-hidden divide-x divide-white/10 text-sm">
                <button className="flex-1 py-3 px-4 text-center text-white/90 hover:bg-white/5 transition-colors">
                  Jan 15
                </button>
                <button className="flex-1 py-3 px-4 text-center text-white/90 hover:bg-white/5 transition-colors">
                  3 guests
                </button>
              </div>

              {/* Price Breakdown */}
              <div className="flex flex-col gap-4 text-sm">
                <div className="flex justify-between items-start group cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-white font-medium">Due today</span>
                    <span className="text-white/50 text-xs">Jan 19 - Jan 31</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    $2,520
                    <svg className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="flex justify-between items-start group cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-white/90">Discounted Monthly Rate</span>
                    <span className="text-white/50 text-xs">Feb 1 - Feb 28</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    $4,488
                    <svg className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>

                <div className="flex justify-between items-start group cursor-pointer">
                  <div className="flex flex-col">
                    <span className="text-white/90">Monthly Rate</span>
                    <span className="text-white/50 text-xs">Starting March 1</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    $5,149
                    <svg className="w-4 h-4 text-white/50 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {/* Reserve Action */}
              <div className="flex flex-col gap-3 mt-2">
                <button className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors border border-white/10">
                  Reserve
                </button>
                <button className="text-xs text-center text-white/50 hover:text-white/80 transition-colors">
                  Qualification Requirements
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
