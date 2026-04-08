import Link from "next/link";
import { HeaderAuthSection } from "./header-auth-section";

export async function Header() {
  return (
    <header className="px-6 lg:px-12 py-6 flex items-center justify-between max-w-[1600px] mx-auto w-full">
      <Link href="/" className="flex flex-col text-[#2b2b36] cursor-pointer">
        <span className="text-xl sm:text-2xl font-light tracking-widest leading-none">FEATHERS</span>
        <div className="flex items-center">
          <div className="w-6 h-[1px] bg-[#2b2b36] mr-1"></div>
          <span className="text-xl sm:text-2xl font-light tracking-widest leading-none">HOUSES</span>
        </div>
        <span className="text-[10px] tracking-[0.2em] text-[#2b2b36]/60 mt-1">HOLIDAY RENTALS</span>
      </Link>

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

      <HeaderAuthSection />
    </header>
  );
}
