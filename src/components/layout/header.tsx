import { Menu } from "lucide-react";
import Link from "next/link";

export function Header() {
  return (
    <header className="px-6 lg:px-12 py-6 flex items-center justify-between max-w-[1600px] mx-auto w-full">
      {/* Logo */}
      <Link href="/" className="flex flex-col text-[#2b2b36] cursor-pointer">
        <span className="text-xl sm:text-2xl font-light tracking-widest leading-none">FEATHERS</span>
        <div className="flex items-center">
          <div className="w-6 h-[1px] bg-[#2b2b36] mr-1"></div>
          <span className="text-xl sm:text-2xl font-light tracking-widest leading-none">HOUSES</span>
        </div>
        <span className="text-[10px] tracking-[0.2em] text-[#2b2b36]/60 mt-1">HOLIDAY RENTALS</span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden md:flex items-center bg-white rounded-full p-1 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100">
        <Link href="/" className="px-6 py-2.5 rounded-full bg-[#363645] text-white text-sm font-medium transition-colors">
          Home
        </Link>
        <Link href="/properties" className="px-6 py-2.5 rounded-full text-[#363645] text-sm font-medium hover:bg-gray-50 transition-colors">
          Properties
        </Link>
        <Link href="/locations" className="px-6 py-2.5 rounded-full text-[#363645] text-sm font-medium hover:bg-gray-50 transition-colors">
          Locations
        </Link>
        <Link href="/about" className="px-6 py-2.5 rounded-full text-[#363645] text-sm font-medium hover:bg-gray-50 transition-colors">
          About
        </Link>
        <Link href="/contact" className="px-6 py-2.5 rounded-full text-[#363645] text-sm font-medium hover:bg-gray-50 transition-colors">
          Contact
        </Link>
      </nav>

      {/* Right CTA & Mobile Toggle */}
      <div className="flex items-center gap-4">
        <Link href="/properties" className="hidden sm:block px-6 py-2.5 rounded-full border border-[#2b2b36] text-[#2b2b36] text-sm font-medium hover:bg-[#2b2b36] hover:text-white transition-all">
          Book Now
        </Link>
        <button className="md:hidden p-2 text-[#2b2b36]">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
