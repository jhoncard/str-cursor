import { Header } from "@/components/layout/header";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { desc, inArray } from "drizzle-orm";

type WebhookRow = {
  eventId: string;
  createdAt: string;
  sessionId: string;
  paymentIntentId: string | null;
  propertySlug: string | null;
  guestEmail: string | null;
  bookingConfirmationCode: string | null;
  finalized: boolean;
};

export default async function WebhookLogsPage() {
  const stripe = getStripe();
  const events = await stripe.events.list({
    type: "checkout.session.completed",
    limit: 20,
  });

  const sessions = events.data
    .map((event) => event.data.object)
    .filter(
      (obj): obj is {
        id: string;
        payment_intent: string | null;
        metadata?: Record<string, string>;
      } => obj && typeof obj === "object" && "id" in obj
    );

  const paymentIntentIds = sessions
    .map((session) =>
      typeof session.payment_intent === "string" ? session.payment_intent : null
    )
    .filter((id): id is string => Boolean(id));

  const dbBookings =
    paymentIntentIds.length > 0
      ? await db
          .select({
            paymentIntentId: bookings.paymentIntentId,
            confirmationCode: bookings.confirmationCode,
          })
          .from(bookings)
          .where(inArray(bookings.paymentIntentId, paymentIntentIds))
          .orderBy(desc(bookings.createdAt))
      : [];

  const bookingByPaymentIntent = new Map(
    dbBookings
      .filter((row) => row.paymentIntentId)
      .map((row) => [row.paymentIntentId as string, row.confirmationCode])
  );

  const rows: WebhookRow[] = sessions.map((session, index) => {
    const event = events.data[index];
    const paymentIntentId =
      typeof session.payment_intent === "string" ? session.payment_intent : null;
    const confirmationCode = paymentIntentId
      ? bookingByPaymentIntent.get(paymentIntentId) ?? null
      : null;

    return {
      eventId: event.id,
      createdAt: new Date(event.created * 1000).toLocaleString(),
      sessionId: session.id,
      paymentIntentId,
      propertySlug: session.metadata?.propertySlug ?? null,
      guestEmail: session.metadata?.email ?? null,
      bookingConfirmationCode: confirmationCode,
      finalized: Boolean(confirmationCode),
    };
  });

  return (
    <div className="min-h-screen bg-[#f4f6f8] font-sans pb-24">
      <Header />
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-[#2b2b36]">
                Stripe Webhook Logs
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Recent checkout completion events and booking finalization status.
              </p>
            </div>
            <a
              href="/admin/webhooks"
              className="px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-[#2b2b36] hover:bg-gray-50"
            >
              Refresh
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="py-3 pr-4">Created</th>
                  <th className="py-3 pr-4">Property</th>
                  <th className="py-3 pr-4">Guest</th>
                  <th className="py-3 pr-4">Payment Intent</th>
                  <th className="py-3 pr-4">Booking</th>
                  <th className="py-3 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.eventId} className="border-b border-gray-50">
                    <td className="py-3 pr-4 text-[#2b2b36]">{row.createdAt}</td>
                    <td className="py-3 pr-4 text-[#2b2b36]">
                      {row.propertySlug ?? "N/A"}
                    </td>
                    <td className="py-3 pr-4 text-[#2b2b36]">
                      {row.guestEmail ?? "N/A"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-600">
                      {row.paymentIntentId ?? "N/A"}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700">
                      {row.bookingConfirmationCode ?? "PENDING"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          row.finalized
                            ? "inline-flex items-center rounded-full bg-green-50 text-green-700 px-2.5 py-1 text-xs font-medium"
                            : "inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2.5 py-1 text-xs font-medium"
                        }
                      >
                        {row.finalized ? "Finalized" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
