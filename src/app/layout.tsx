import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/footer";

const DEFAULT_SITE_URL = "https://feathershouses.com";

/** Avoid crashing the app when NEXT_PUBLIC_APP_URL is host-only or invalid. */
function getMetadataBase(): URL {
  let raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return new URL(DEFAULT_SITE_URL);
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    return new URL(raw);
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    template: "%s | Feathers Houses",
    default: "Feathers Houses | Direct Booking Vacation Rentals in Tampa Bay",
  },
  description:
    "Book directly and save 10-15%. Premium short-term rentals in Tampa and St. Petersburg, Florida. Superhost quality, pet-friendly properties.",
  openGraph: {
    title: "Feathers Houses | Direct Booking Vacation Rentals in Tampa Bay",
    description:
      "Book directly and save 10-15%. Premium short-term rentals in Tampa and St. Petersburg, Florida. Superhost quality, pet-friendly properties.",
    locale: "en_US",
    type: "website",
    siteName: "Feathers Houses",
  },
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Footer />
      </body>
    </html>
  );
}
