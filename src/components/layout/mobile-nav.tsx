"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import type { UserProfile } from "@/lib/user-profile";

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Properties", href: "/properties" },
  { name: "Locations", href: "/locations" },
  { name: "About", href: "/about" },
  { name: "Contact", href: "/contact" },
];

export function MobileNav({ user }: { user: UserProfile | null }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden rounded-xl p-2.5 text-[#2b2b36] bg-white shadow-md ring-1 ring-[#2b2b36]/20 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" strokeWidth={2.25} />
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full sm:max-w-sm p-0 border-l border-gray-200 bg-white text-[#2b2b36] shadow-2xl [&_[data-slot=sheet-close]]:text-[#2b2b36] [&_[data-slot=sheet-close]]:hover:bg-gray-100"
      >
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <nav className="flex flex-col h-full pt-14 px-6 pb-8 sm:px-8 bg-white text-[#2b2b36]">
          <ul className="flex-1 divide-y divide-gray-200">
            {navLinks.map((link) => (
              <li key={link.name}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="block py-3.5 text-lg font-semibold text-[#2b2b36] hover:text-[#1a1a22] active:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    />
                  }
                >
                  {link.name}
                </SheetClose>
              </li>
            ))}

            {user && (
              <li>
                <SheetClose
                  render={
                    <Link
                      href="/dashboard"
                      className="block py-3.5 text-lg font-semibold text-[#2b2b36] hover:text-[#1a1a22] active:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    />
                  }
                >
                  My Reservations
                </SheetClose>
              </li>
            )}

            {user?.role === "admin" && (
              <li>
                <SheetClose
                  render={
                    <Link
                      href="/admin"
                      className="block py-3.5 text-lg font-semibold text-[#2b2b36] hover:text-[#1a1a22] active:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    />
                  }
                >
                  Admin Dashboard
                </SheetClose>
              </li>
            )}
          </ul>

          <div className="mt-8 space-y-3 border-t border-gray-200 pt-6">
            {user ? (
              <>
                <div className="text-sm text-gray-700 font-medium truncate px-1">
                  {user.email}
                </div>
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="block w-full text-center py-3.5 rounded-full border-2 border-red-300 bg-white text-red-700 text-base font-semibold hover:bg-red-50 transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
              </>
            ) : (
              <>
                <SheetClose
                  render={
                    <Link
                      href="/register"
                      className="block w-full text-center py-3.5 rounded-full bg-[#2b2b36] text-white text-base font-semibold hover:bg-[#363645] transition-colors shadow-sm"
                    />
                  }
                >
                  Sign up
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/login"
                      className="block w-full text-center py-3.5 rounded-full border-2 border-[#2b2b36] bg-white text-[#2b2b36] text-base font-semibold hover:bg-gray-100 transition-colors"
                    />
                  }
                >
                  Sign in
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/properties"
                      className="block w-full text-center py-3.5 rounded-full border-2 border-gray-300 bg-gray-50 text-[#2b2b36] text-base font-semibold hover:bg-gray-100 transition-colors"
                    />
                  }
                >
                  Book Now
                </SheetClose>
              </>
            )}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
