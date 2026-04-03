import { Award, Key, PawPrint, Wallet } from "lucide-react";

const props = [
  {
    icon: Wallet,
    title: "Book Direct & Save",
    description: "Save 10-15% vs OTA platforms",
  },
  {
    icon: Key,
    title: "Self Check-in",
    description: "Smart lock access, arrive on your schedule",
  },
  {
    icon: Award,
    title: "Superhost Quality",
    description: "4.87 avg rating, 250+ reviews",
  },
  {
    icon: PawPrint,
    title: "Pet Friendly",
    description: "Furry friends welcome at select properties",
  },
];

export function ValueProps() {
  return (
    <section className="mt-10 md:mt-14">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {props.map((prop) => (
          <div
            key={prop.title}
            className="bg-white rounded-2xl p-6 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] flex flex-col gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-[#f4f6f8] flex items-center justify-center">
              <prop.icon className="w-5 h-5 text-[#2b2b36]" />
            </div>
            <h3 className="text-[#2b2b36] font-semibold text-sm">
              {prop.title}
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              {prop.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
