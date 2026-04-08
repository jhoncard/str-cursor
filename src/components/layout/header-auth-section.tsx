"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { UserProfile } from "@/lib/user-profile";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

export function HeaderAuthSection() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) {
          if (!cancelled) setReady(true);
          return;
        }
        const data = (await res.json()) as { user: UserProfile | null };
        if (!cancelled) {
          setUser(data.user);
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center gap-4" aria-busy="true">
        <div className="hidden sm:flex items-center gap-2 min-w-[200px] min-h-[40px]" />
        <div className="md:hidden w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <UserMenu user={user} />
      ) : (
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/register"
            className="px-5 py-2.5 rounded-full bg-[#2b2b36] text-white text-sm font-semibold hover:bg-[#363645] transition-all"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-full border border-[#2b2b36] text-[#2b2b36] text-sm font-medium hover:bg-[#2b2b36] hover:text-white transition-all"
          >
            Sign in
          </Link>
        </div>
      )}
      <MobileNav user={user} />
    </div>
  );
}
