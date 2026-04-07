import Link from "next/link";

import { requireAdminPage } from "@/lib/auth";
import { listBookingsForAdmin } from "@/lib/admin/bookings-from-db";
import { format } from "date-fns";

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
  const rows = await listBookingsForAdmin();

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
                <th className="px-5 py-4 font-semibold text-right">Edit</th>
                <th className="px-5 py-4 font-semibold text-center">Payment</th>
                <th className="px-5 py-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-12 text-center text-[#2b2b36]/40"
                  >
                    No reservations found
                  </td>
                </tr>
              )}
              {rows.map((b) => {
                const totalDisplay = Number(b.totalAmount);
                return (
                <tr
                  key={b.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(b.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-medium text-[#2b2b36]">
                      {`${b.guestFirstName} ${b.guestLastName}`}
                    </div>
                    <div className="text-xs text-[#2b2b36]/40">
                      {b.guestEmail}
                    </div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36] font-medium">
                    {b.propertyName}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(String(b.checkIn)), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                    {format(new Date(String(b.checkOut)), "MMM d, yyyy")}
                  </td>
                  <td className="px-5 py-4 text-center text-[#2b2b36]/60">
                    {b.numGuests}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-[#2b2b36] whitespace-nowrap">
                    ${totalDisplay.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/reservations/${b.id}/edit`}
                      className="text-xs font-medium text-[#2b2b36] underline hover:text-[#414152]"
                    >
                      Edit
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                        paymentBadge[b.paymentStatus] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {b.paymentStatus}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                        bookingBadge[b.bookingStatus] ??
                        "bg-gray-50 text-gray-600 border-gray-200"
                      }`}
                    >
                      {b.bookingStatus}
                    </span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
