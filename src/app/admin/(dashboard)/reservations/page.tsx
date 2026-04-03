import { requireAdminPage } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

type Booking = {
  id: string;
  confirmation_code: string;
  check_in: string;
  check_out: string;
  num_guests: number;
  total_amount: number;
  payment_status: string;
  booking_status: string;
  created_at: string;
  guests: { first_name: string; last_name: string; email: string; phone: string } | null;
  properties: { name: string; slug: string } | null;
};

const paymentBadge: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-purple-50 text-purple-700 border-purple-200",
};

const bookingBadge: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  completed: "bg-blue-50 text-blue-700 border-blue-200",
};

export default async function ReservationsPage() {
  await requireAdminPage();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "*, guests:guest_id(first_name, last_name, email, phone), properties:property_id(name, slug)"
    )
    .order("created_at", { ascending: false });

  const rows = (bookings ?? []) as Booking[];

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-6">
        Reservations
      </h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[#2b2b36]/50 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Guest</th>
                <th className="px-5 py-4 font-semibold">Property</th>
                <th className="px-5 py-4 font-semibold">Check-in</th>
                <th className="px-5 py-4 font-semibold">Check-out</th>
                <th className="px-5 py-4 font-semibold text-center">Guests</th>
                <th className="px-5 py-4 font-semibold text-right">Total</th>
                <th className="px-5 py-4 font-semibold text-center">Payment</th>
                <th className="px-5 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-12 text-center text-[#2b2b36]/40"
                  >
                    No reservations found
                  </td>
                </tr>
              )}
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(b.created_at), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-medium text-[#2b2b36]">
                      {b.guests
                        ? `${b.guests.first_name} ${b.guests.last_name}`
                        : "Unknown"}
                    </div>
                    <div className="text-xs text-[#2b2b36]/40">
                      {b.guests?.email}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36] font-medium">
                    {b.properties?.name ?? "N/A"}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(b.check_in), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(b.check_out), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 text-center text-[#2b2b36]/60">
                    {b.num_guests}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-[#2b2b36] whitespace-nowrap">
                    ${b.total_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                        paymentBadge[b.payment_status] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {b.payment_status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                        bookingBadge[b.booking_status] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {b.booking_status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
