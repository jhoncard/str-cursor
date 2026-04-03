import { Header } from "@/components/layout/header";
import BookingForm from "./booking-form";

export default async function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24">
      <Header />
      <BookingForm params={params} />
    </div>
  );
}
