import { ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

const comparisons = [
  { label: "Weekend Getaway (2 nights)", otaPrice: "$340", ourPrice: "$289" },
  { label: "Week-long Stay (7 nights)", otaPrice: "$1,120", ourPrice: "$952" },
  { label: "Monthly Stay (30 nights)", otaPrice: "$4,200", ourPrice: "$3,570" },
];

const benefits = [
  "No service fees or hidden charges",
  "Direct communication with your host",
  "Flexible cancellation policy",
  "Best price guarantee",
];

export function WhyBookDirect() {
  return (
    <section className="mt-14 md:mt-20 bg-[#2b2b36] rounded-[2rem] p-8 md:p-14 shadow-xl">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-10 text-center">
          Why Book Direct?
        </h2>

        <div className="grid md:grid-cols-3 gap-4 mb-10">
          {comparisons.map((item) => (
            <div
              key={item.label}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center"
            >
              <p className="text-white/70 text-sm mb-4">{item.label}</p>
              <p className="text-white/50 text-lg line-through mb-1">
                {item.otaPrice}
              </p>
              <p className="text-white text-3xl font-bold">{item.ourPrice}</p>
              <p className="text-emerald-400 text-xs font-medium mt-2">
                Save 10-15%
              </p>
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3 mb-10 max-w-lg mx-auto">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-white/80 text-sm">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-white text-[#2b2b36] font-medium hover:bg-white/90 transition-colors"
          >
            Browse Properties
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
