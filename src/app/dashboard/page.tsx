import Link from "next/link";
import { Header } from "@/components/layout/header";
import { requireUser } from "@/lib/auth";
import { listBookingsForGuestEmail } from "@/lib/admin/bookings-from-db";
import {
  CalendarDays,
  Users,
  Hash,
  MapPin,
  CreditCard,
  Search,
} from "lucide-react";

type Booking = {
  id: string;
  confirmation_code: string;
  property_id: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount: string;
  payment_status: "pending" | "paid" | "refunded" | "partial_refund";
  booking_status: "confirmed" | "cancelled" | "completed" | "no_show";
  created_at: string;
  properties: { name: string; slug: string } | null;
};

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PaymentBadge({ status }: { status: Booking["payment_status"] }) {
  const styles: Record<string, string> = {
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    refunded: "bg-gray-100 text-gray-600 border-gray-200",
    partial_refund: "bg-orange-50 text-orange-700 border-orange-200",
  };
  const labels: Record<string, string> = {
    paid: "Paid",
    pending: "Pending",
    refunded: "Refunded",
    partial_refund: "Partial Refund",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function BookingStatusBadge({ status }: { status: Booking["booking_status"] }) {
  const styles: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
    no_show: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const labels: Record<string, string> = {
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    completed: "Completed",
    no_show: "No Show",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const propertyName = booking.properties?.name ?? "Unknown Property";
  const propertySlug = booking.properties?.slug;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-6 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)] transition-shadow">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-start justify-between sm:justify-start gap-3">
            {propertySlug ? (
              <Link
                href={`/properties/${propertySlug}`}
                className="text-lg font-semibold text-[#2b2b36] hover:underline underline-offset-2 truncate"
              >
                {propertyName}
              </Link>
            ) : (
              <span className="text-lg font-semibold text-[#2b2b36] truncate">
                {propertyName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-[#2b2b36]/60">
            <Hash className="w-3.5 h-3.5 shrink-0" />
            <span className="font-mono font-medium text-[#2b2b36]">
              {booking.confirmation_code}
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#2b2b36]/70">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
              <span>
                {formatDate(booking.check_in)} &ndash;{" "}
                {formatDate(booking.check_out)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>
                {booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium text-[#2b2b36]">
                ${Number(booking.total_amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2">
          <BookingStatusBadge status={booking.booking_status} />
          <PaymentBadge status={booking.payment_status} />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] p-12 text-center">
      <div className="w-16 h-16 bg-[#f4f6f8] rounded-full flex items-center justify-center mx-auto mb-5">
        <MapPin className="w-7 h-7 text-[#2b2b36]/40" />
      </div>
      <h2 className="text-xl font-semibold text-[#2b2b36] mb-2">
        No reservations yet
      </h2>
      <p className="text-[#2b2b36]/60 mb-6 max-w-sm mx-auto">
        When you book a stay with us, your reservations will appear here.
      </p>
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2b2b36] text-white text-sm font-medium hover:bg-[#363645] transition-colors"
      >
        <Search className="w-4 h-4" />
        Browse Properties
      </Link>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const user = await requireUser();

  const rawBookings = user.email
    ? await listBookingsForGuestEmail(user.email)
    : [];

  const bookings: Booking[] = rawBookings.map((b) => ({
    id: b.id,
    confirmation_code: b.confirmationCode,
    property_id: "",
    check_in: String(b.checkIn),
    check_out: String(b.checkOut),
    num_guests: b.numGuests,
    total_amount: String(b.totalAmount),
    payment_status: b.paymentStatus,
    booking_status: b.bookingStatus,
    created_at: b.createdAt.toISOString(),
    properties: { name: b.propertyName, slug: b.propertySlug },
  }));

  const today = new Date().toISOString().split("T")[0];
  const upcoming = bookings.filter((b) => b.check_in >= today);
  const past = bookings.filter((b) => b.check_in < today);

  const firstName =
    user.fullName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-12">
      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-12 mt-6">
        {notice === "not_admin" && (
          <div
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            That account doesn&apos;t have admin access. If you manage
            properties, ask the owner to set your role to admin in Supabase, then
            use{" "}
            <a href="/admin/login" className="font-semibold underline">
              Staff sign in
            </a>
            .
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-[#2b2b36]/60 mt-1">
            Manage your reservations and trips
          </p>
        </div>

        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-10">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#2b2b36] mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Upcoming
                  <span className="text-sm font-normal text-[#2b2b36]/50 ml-1">
                    ({upcoming.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {upcoming.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-[#2b2b36] mb-4 flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  Past
                  <span className="text-sm font-normal text-[#2b2b36]/50 ml-1">
                    ({past.length})
                  </span>
                </h2>
                <div className="space-y-3">
                  {past.map((booking) => (
                    <BookingCard key={booking.id} booking={booking} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
