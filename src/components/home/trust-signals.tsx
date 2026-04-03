import { Award, Calendar, Home, Star } from "lucide-react";

const signals = [
  { icon: Award, label: "Superhost" },
  { icon: Star, label: "250+ Five-Star Reviews" },
  { icon: Calendar, label: "4+ Years Hosting" },
  { icon: Home, label: "4 Properties" },
];

export function TrustSignals() {
  return (
    <section className="mt-14 md:mt-20">
      <div className="bg-white border border-gray-100 rounded-2xl px-6 py-5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap justify-between items-center gap-6">
          {signals.map((signal) => (
            <div
              key={signal.label}
              className="flex items-center gap-3"
            >
              <signal.icon className="w-5 h-5 text-[#2b2b36]" />
              <span className="text-[#2b2b36] font-medium text-sm">
                {signal.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
