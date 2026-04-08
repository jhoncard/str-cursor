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
        className="md:hidden p-2 text-[#2b2b36]"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-sm p-0">
        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
        <nav className="flex flex-col h-full pt-16 px-8 pb-8">
          <ul className="space-y-1 flex-1">
            {navLinks.map((link) => (
              <li key={link.name}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="block py-3 text-lg font-medium text-[#2b2b36] hover:text-[#2b2b36]/70 transition-colors"
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
                      className="block py-3 text-lg font-medium text-[#2b2b36] hover:text-[#2b2b36]/70 transition-colors"
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
                      className="block py-3 text-lg font-medium text-[#2b2b36] hover:text-[#2b2b36]/70 transition-colors"
                    />
                  }
                >
                  Admin Dashboard
                </SheetClose>
              </li>
            )}
          </ul>

          <div className="space-y-3">
            {user ? (
              <>
                <div className="text-sm text-gray-500 truncate px-1">
                  {user.email}
                </div>
                <form action="/auth/signout" method="POST">
                  <button
                    type="submit"
                    className="block w-full text-center py-3.5 rounded-full border border-red-200 text-red-600 text-base font-medium hover:bg-red-50 transition-colors"
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
                      className="block w-full text-center py-3.5 rounded-full bg-[#2b2b36] text-white text-base font-semibold hover:bg-[#2b2b36]/90 transition-colors"
                    />
                  }
                >
                  Sign up
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/login"
                      className="block w-full text-center py-3.5 rounded-full border border-[#2b2b36] text-[#2b2b36] text-base font-medium hover:bg-gray-50 transition-colors"
                    />
                  }
                >
                  Sign in
                </SheetClose>
                <SheetClose
                  render={
                    <Link
                      href="/properties"
                      className="block w-full text-center py-3.5 rounded-full border border-gray-200 text-[#2b2b36] text-base font-medium hover:bg-gray-50 transition-colors"
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
