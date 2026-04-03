import Link from "next/link";
import { Header } from "@/components/layout/header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#f4f6f8] flex flex-col">
      <Header />
      <main className="flex-1 flex items-center justify-center px-6 py-20">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-14 sm:px-14 sm:py-20 text-center max-w-md w-full">
          <h1 className="text-7xl sm:text-8xl font-bold text-[#2b2b36] tracking-tight">
            404
          </h1>
          <p className="mt-4 text-lg text-[#2b2b36]/60">
            Page not found
          </p>
          <p className="mt-2 text-sm text-[#2b2b36]/40">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link
            href="/"
            className="inline-block mt-8 px-8 py-3 rounded-full bg-[#2b2b36] text-white text-sm font-medium hover:bg-[#2b2b36]/90 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
