import { Header } from "@/components/layout/header";
import { db } from "@/lib/db";
import { properties } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import BookingForm from "./booking-form";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = await db.query.properties.findFirst({
    where: eq(properties.slug, slug),
    columns: { guestContractPdfUrl: true },
  });
  const guestContractPdfUrl = row?.guestContractPdfUrl?.trim()
    ? row.guestContractPdfUrl.trim()
    : null;

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24">
      <Header />
      <BookingForm params={params} guestContractPdfUrl={guestContractPdfUrl} />
    </div>
  );
}
