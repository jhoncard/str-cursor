import { requireAdminPage } from "@/lib/auth";
import { listBookingsWithPaymentIntents } from "@/lib/admin/bookings-from-db";
import { getStripe } from "@/lib/stripe";
import { format } from "date-fns";

const statusBadge: Record<string, string> = {
  succeeded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  requires_payment_method: "bg-red-50 text-red-700 border-red-200",
  requires_confirmation: "bg-amber-50 text-amber-700 border-amber-200",
  canceled: "bg-gray-100 text-gray-600 border-gray-200",
  requires_action: "bg-amber-50 text-amber-700 border-amber-200",
};

export default async function PaymentsPage() {
  await requireAdminPage();

  const stripe = getStripe();

  const [paymentIntents, bookingRows] = await Promise.all([
    stripe.paymentIntents.list({ limit: 50 }),
    listBookingsWithPaymentIntents(),
  ]);

  const bookingMap = new Map<
    string,
    { confirmation_code: string; email: string | null }
  >();

  for (const b of bookingRows) {
    if (b.paymentIntentId) {
      bookingMap.set(b.paymentIntentId, {
        confirmation_code: b.confirmationCode,
        email: b.guestEmail,
      });
    }
  }

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36] tracking-tight mb-6">
        Payments
      </h1>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-100 text-[#2b2b36]/50 text-xs uppercase tracking-wider">
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold text-right">Amount</th>
                <th className="px-5 py-4 font-semibold text-center">Currency</th>
                <th className="px-5 py-4 font-semibold text-center">Status</th>
                <th className="px-5 py-4 font-semibold">Customer</th>
                <th className="px-5 py-4 font-semibold">Booking</th>
              </tr>
            </thead>
            <tbody>
              {paymentIntents.data.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-[#2b2b36]/40"
                  >
                    No payment intents found
                  </td>
                </tr>
              )}
              {paymentIntents.data.map((pi) => {
                const match = bookingMap.get(pi.id);
                const email =
                  match?.email ??
                  pi.receipt_email ??
                  (typeof pi.customer === "string" ? pi.customer : null);
                const displayStatus = pi.status.replace(/_/g, " ");

                return (
                  <tr
                    key={pi.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                      {format(new Date(pi.created * 1000), "MMM d, yyyy HH:mm")}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-[#2b2b36] whitespace-nowrap">
                      ${(pi.amount / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-center uppercase text-[#2b2b36]/50 font-medium">
                      {pi.currency}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${
                          statusBadge[pi.status] ??
                          "bg-gray-100 text-gray-600 border-gray-200"
                        }`}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-[#2b2b36]/60">
                      {email ?? <span className="italic text-[#2b2b36]/30">N/A</span>}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {match ? (
                        <span className="font-mono text-xs bg-[#2b2b36]/5 px-2 py-1 rounded-md text-[#2b2b36]">
                          {match.confirmation_code}
                        </span>
                      ) : (
                        <span className="text-[#2b2b36]/30 italic">No match</span>
                      )}
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
