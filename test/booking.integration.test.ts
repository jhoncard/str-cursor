import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { NextRequest } from "next/server";
import { localPostgres } from "./local-postgres";
import { reservePaidBooking, type PaidBooking } from "@/lib/booking/reserve";
import { availability, bookings, guests, properties, propertyIcalFeeds, propertyIcalBlockedDates } from "@/lib/db/schema";
import { writePriceLabsRate } from "@/lib/pricelabs/write-rate";

const effects = vi.hoisted(() => ({
  email: vi.fn().mockResolvedValue({ id: "fake-email" }),
  seam: vi.fn().mockResolvedValue({ doorCode: null }),
}));
let database: Awaited<ReturnType<typeof localPostgres>>;
// The API and orchestration use the real isolated DB; providers cannot send anything.
vi.mock("@/lib/db", () => ({ db: new Proxy({}, { get: (_, key) => Reflect.get(database.db, key) }) }));
vi.mock("@/lib/email", () => ({ sendEmail: effects.email }));
vi.mock("@/lib/seam/provision-booking", () => ({ provisionSeamAccessCodeForBooking: effects.seam }));
vi.mock("@/lib/stripe", () => ({ getStripe: () => stripe }));
vi.mock("@/lib/ratelimit", () => ({
  checkoutLimiter: null, clientIpFromHeaders: () => "127.0.0.1",
  assertWithinLimit: async () => ({ ok: true }),
}));
import { POST as checkout } from "@/app/api/stripe/checkout-session/route";
import { POST as webhook } from "@/app/api/stripe/webhook/route";
import { GET as sessionStatus } from "@/app/api/stripe/session/route";
import { finalizeBookingFromStripe } from "@/lib/booking/finalize";

const stripe = new Stripe("sk_test_isolated_no_network");
const payment = vi.spyOn(stripe.paymentIntents, "retrieve");
const webhookSecret = "whsec_isolated_booking_test";
let propertyId: string;
const paid = (overrides: Partial<PaidBooking> = {}): PaidBooking => ({
  paymentIntentId: "pi_test1", propertySlug: "st-pete-oasis", checkIn: "2030-06-01", checkOut: "2030-06-04",
  numGuests: 2, firstName: "Test", lastName: "Guest", email: "guest@example.invalid",
  totalAmount: 390, nightlyRate: 100, cleaningFee: 90, ...overrides,
});

beforeAll(async () => {
  database = await localPostgres();
  // Model the inspected pre-migration database; this index must be added by SQL.
  await database.client`DROP INDEX bookings_payment_intent_unique`;
  await database.client.unsafe(await readFile("test/fixtures/legacy-booking-triggers.sql", "utf8"));
  const migrationConnection = await database.client.reserve();
  try {
    await migrationConnection.unsafe(await readFile("supabase/migrations/20261029120000_reservation_integrity.sql", "utf8"));
  } finally { await migrationConnection.release(); }
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
});
afterAll(async () => { vi.unstubAllEnvs(); await database?.cleanup(); });
beforeEach(async () => {
  vi.clearAllMocks();
  payment.mockResolvedValue({ status: "succeeded", amount_received: 1000000, currency: "usd",
    latest_charge: { id: "ch_isolated", refunded: false, amount_refunded: 0 },
  } as unknown as Stripe.Response<Stripe.PaymentIntent>);
  await database.client`TRUNCATE properties, guests CASCADE`;
  const [property] = await database.db.insert(properties).values({
    slug: "st-pete-oasis", name: "Test House", propertyType: "entire_home", locationCity: "Test City",
    maxGuests: 4, basePriceNight: "100",
  }).returning({ id: properties.id });
  propertyId = property.id;
});

describe.each([true, false])("atomic reservation (legacy blocking trigger: %s)", (legacyTrigger) => {
  beforeEach(async () => {
    await database.client.unsafe(`ALTER TABLE bookings ${legacyTrigger ? "ENABLE" : "DISABLE"} TRIGGER trg_block_availability`);
  });
  it("allows only one of simultaneous overlapping payments", async () => {
    const results = await Promise.allSettled([
      reservePaidBooking(database.db, paid()),
      reservePaidBooking(database.db, paid({ paymentIntentId: "pi_test2", checkIn: "2030-06-03", checkOut: "2030-06-06" })),
    ]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await database.db.select().from(bookings)).toHaveLength(1);
    expect(await database.db.select().from(availability)).toHaveLength(3);
  });
  it("deduplicates simultaneous retries of the same payment", async () => {
    const results = await Promise.all(Array.from({ length: 6 }, () => reservePaidBooking(database.db, paid())));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    expect(results.filter(r => !r.alreadyExists)).toHaveLength(1);
    expect(await database.db.select().from(bookings)).toHaveLength(1);
    expect((await database.client`SELECT total_bookings FROM guests`)[0].total_bookings).toBe(1);
  });
  it("permits adjacent stays on the checkout date", async () => {
    await reservePaidBooking(database.db, paid());
    await reservePaidBooking(database.db, paid({ paymentIntentId: "pi_adjacent", checkIn: "2030-06-04", checkOut: "2030-06-05" }));
    expect(await database.db.select().from(bookings)).toHaveLength(2);
  });
  it("rolls back guest, reservation, counters and nights after a failed nightly write; replay succeeds", async () => {
    await database.client.unsafe(`CREATE FUNCTION fail_test_night() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN IF NEW.date = '2030-06-03' THEN RAISE EXCEPTION 'injected test failure'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER fail_test_night BEFORE INSERT OR UPDATE ON availability FOR EACH ROW EXECUTE FUNCTION fail_test_night();`);
    try {
      await expect(reservePaidBooking(database.db, paid())).rejects.toThrow();
      expect(await database.db.select().from(bookings)).toHaveLength(0);
      expect(await database.db.select().from(guests)).toHaveLength(0);
      expect(await database.db.select().from(availability)).toHaveLength(0);
    } finally {
      await database.client.unsafe("DROP TRIGGER fail_test_night ON availability; DROP FUNCTION fail_test_night();");
    }
    await expect(reservePaidBooking(database.db, paid())).resolves.toMatchObject({ alreadyExists: false });
  });
});

it("handles the same guest booking different properties simultaneously", async () => {
  await database.db.insert(properties).values({ slug: "second", name: "Second", propertyType: "room", locationCity: "Test", basePriceNight: "100" });
  await Promise.all([
    reservePaidBooking(database.db, paid()),
    reservePaidBooking(database.db, paid({ paymentIntentId: "pi_other", propertySlug: "second" })),
  ]);
  expect(await database.db.select().from(guests)).toHaveLength(1);
  expect(await database.db.select().from(bookings)).toHaveLength(2);
});

it("locks protect webhooks before migration too; applying the migration again is safe", async () => {
  await database.client.unsafe("ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlapping_stays; DROP INDEX bookings_payment_intent_unique;");
  try {
    const competing = await Promise.allSettled([
      reservePaidBooking(database.db, paid()),
      reservePaidBooking(database.db, paid({ paymentIntentId: "pi_competing" })),
    ]);
    expect(competing.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const replay = paid({ paymentIntentId: "pi_replay", checkIn: "2030-07-01", checkOut: "2030-07-02" });
    const results = await Promise.all(Array.from({ length: 4 }, () => reservePaidBooking(database.db, replay)));
    expect(results.filter(result => !result.alreadyExists)).toHaveLength(1);
    expect(await database.db.select().from(bookings)).toHaveLength(2);
  } finally {
    const connection = await database.client.reserve();
    try {
      const migration = await readFile("supabase/migrations/20261029120000_reservation_integrity.sql", "utf8");
      await connection.unsafe(migration);
      await connection.unsafe(migration);
    } finally { await connection.release(); }
  }
});

it("rejects an inactive property and excessive guest counts before creating records", async () => {
  await expect(reservePaidBooking(database.db, paid({ numGuests: 5 }))).rejects.toThrow("Guest count exceeds capacity");
  await database.db.update(properties).set({ status: "inactive" }).where(eq(properties.id, propertyId));
  await expect(reservePaidBooking(database.db, paid())).rejects.toThrow("Property unavailable");
  expect(await database.db.select().from(guests)).toHaveLength(0);
  expect(await database.db.select().from(bookings)).toHaveLength(0);
});

it("checkout rejects impossible calendar dates before calling Stripe", async () => {
  const create = vi.spyOn(stripe.checkout.sessions, "create");
  try {
    const response = await checkout(new NextRequest("http://localhost/api/stripe/checkout-session", { method: "POST",
      body: JSON.stringify({ slug: "st-pete-oasis", firstName: "Test", lastName: "Guest", email: "guest@example.invalid",
        phone: "5551234567", checkIn: "2030-02-30", checkOut: "2030-03-03", numGuests: 2 }),
    }));
    expect(response.status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  } finally { create.mockRestore(); }
});

it("rejects manual and imported calendar blocks", async () => {
  await database.db.insert(availability).values({ propertyId, date: "2030-06-01", status: "blocked", source: "manual" });
  await expect(reservePaidBooking(database.db, paid())).rejects.toThrow("Dates are no longer available");
  await database.db.delete(availability);
  const [feed] = await database.db.insert(propertyIcalFeeds).values({ propertyId, feedUrl: "https://example.invalid/calendar.ics", source: "airbnb" }).returning();
  await database.db.insert(propertyIcalBlockedDates).values({ propertyId, icalFeedId: feed.id, blockedDate: "2030-06-02" });
  await expect(reservePaidBooking(database.db, paid())).rejects.toThrow("Dates are no longer available");
});

it("uses reservations as truth even if a legacy calendar row is missing", async () => {
  await reservePaidBooking(database.db, paid());
  await database.db.delete(availability);
  await expect(reservePaidBooking(database.db, paid({ paymentIntentId: "pi_overlap" }))).rejects.toThrow();
});

it("the DB rejects duplicate payments and overlaps even for writers bypassing the service", async () => {
  await reservePaidBooking(database.db, paid());
  const [original] = await database.db.select().from(bookings);
  const { id: _id, ...copy } = original;
  await expect(database.db.insert(bookings).values({ ...copy, confirmationCode: "COPY", checkIn: "2030-07-01", checkOut: "2030-07-02" })).rejects.toThrow();
  await expect(database.db.insert(bookings).values({ ...copy, confirmationCode: "COPY2", paymentIntentId: "pi_different" })).rejects.toThrow();
});

it("pricing sync and rate-only webhooks preserve booked nights and manual blocks", async () => {
  await reservePaidBooking(database.db, paid());
  await database.db.insert(availability).values({ propertyId, date: "2030-06-04", status: "blocked", source: "manual" });
  for (const date of ["2030-06-01", "2030-06-04"]) {
    await writePriceLabsRate(database.db, propertyId, { date, price: 250, available: true });
    await writePriceLabsRate(database.db, propertyId, { date, price: 300 });
  }
  const rows = await database.db.select().from(availability).orderBy(availability.date);
  expect(rows[0]).toMatchObject({ status: "booked", source: "direct", priceOverride: "300" });
  expect(rows[3]).toMatchObject({ status: "blocked", source: "manual", priceOverride: "300" });
  await writePriceLabsRate(database.db, propertyId, { date: "2030-06-05", price: 200, available: false });
  await writePriceLabsRate(database.db, propertyId, { date: "2030-06-05", price: 220 });
  expect((await database.db.select().from(availability).where(eq(availability.date, "2030-06-05")))[0].status).toBe("blocked");
  await writePriceLabsRate(database.db, propertyId, { date: "2030-06-05", price: 220, available: true });
  expect((await database.db.select().from(availability).where(eq(availability.date, "2030-06-05")))[0].status).toBe("available");
});

it("a competing pricing refresh cannot reopen a newly booked night", async () => {
  await Promise.all([
    reservePaidBooking(database.db, paid()),
    writePriceLabsRate(database.db, propertyId, { date: "2030-06-02", price: 220, available: true }),
  ]);
  expect((await database.db.select().from(availability).where(eq(availability.date, "2030-06-02")))[0])
    .toMatchObject({ status: "booked", source: "direct" });
});

function stripeSession(paymentStatus = "paid") {
  return {
    id: "cs_test_isolated", object: "checkout.session", mode: "payment", payment_status: paymentStatus,
    payment_intent: "pi_test1", amount_total: 39000, currency: "usd",
    metadata: { propertySlug: "st-pete-oasis", propertyName: "Test House", checkIn: "2030-06-01", checkOut: "2030-06-04",
      firstName: "Test", lastName: "Guest", email: "guest@example.invalid", numGuests: "2", accommodationSubtotal: "300", cleaningFee: "90" },
  };
}
async function deliver(paymentStatus = "paid", type = "checkout.session.completed", validSignature = true) {
  const body = JSON.stringify({ id: "evt_isolated", object: "event", type, data: { object: stripeSession(paymentStatus) } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: validSignature ? webhookSecret : "wrong" });
  return webhook(new NextRequest("http://localhost/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": signature } }));
}

it("verifies real Stripe signatures, ignores unpaid completions, and finalizes delayed payment once", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await deliver("paid", "checkout.session.completed", false)).status).toBe(400);
    expect((await deliver("unpaid")).status).toBe(200);
    expect(await database.db.select().from(bookings)).toHaveLength(0);
    expect((await deliver("paid", "checkout.session.async_payment_succeeded")).status).toBe(200);
    expect((await deliver()).status).toBe(200);
    expect(await database.db.select().from(bookings)).toHaveLength(1);
    expect(effects.seam).toHaveBeenCalledTimes(1);
    expect(effects.email).toHaveBeenCalledTimes(2);
  } finally { log.mockRestore(); }
});

it("returns retryable failure for a paid but unavailable stay", async () => {
  await reservePaidBooking(database.db, paid({ paymentIntentId: "pi_winner" }));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await deliver()).status).toBe(500);
    expect(effects.email).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("booking_finalization_failed", expect.objectContaining({ reason: "reservation_conflict" }));
  } finally { log.mockRestore(); }
});

it("does not recreate a reservation when an old paid event is replayed after a refund", async () => {
  payment.mockResolvedValueOnce({ status: "succeeded", amount_received: 39000, currency: "usd",
    latest_charge: { id: "ch_refunded", refunded: true, amount_refunded: 39000 },
  } as unknown as Stripe.Response<Stripe.PaymentIntent>);
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  try {
    expect((await deliver()).status).toBe(200);
    expect(await database.db.select().from(bookings)).toHaveLength(0);
    expect(effects.seam).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});

it("fails closed when current Stripe payment status cannot be checked", async () => {
  payment.mockRejectedValueOnce(new Error("test payment lookup unavailable"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect((await deliver()).status).toBe(500);
    expect(await database.db.select().from(bookings)).toHaveLength(0);
  } finally { log.mockRestore(); }
});

it("fulfillment failure leaves the committed reservation intact; replay does not resend", async () => {
  effects.seam.mockRejectedValueOnce(new Error("isolated lock failure"));
  effects.email.mockRejectedValueOnce(new Error("isolated email failure"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await expect(finalizeBookingFromStripe(paid())).resolves.toMatchObject({ alreadyExists: false });
    await expect(finalizeBookingFromStripe(paid())).resolves.toMatchObject({ alreadyExists: true });
    expect(await database.db.select().from(bookings)).toHaveLength(1);
    expect(await database.db.select().from(availability)).toHaveLength(3);
    expect(effects.seam).toHaveBeenCalledTimes(1);
    expect(effects.email).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith("booking_fulfillment_failed", expect.objectContaining({ step: "guest_email" }));
  } finally { log.mockRestore(); }
});

it("session API distinguishes pending, confirmed and cancelled without leaking guest metadata", async () => {
  const retrieve = vi.spyOn(stripe.checkout.sessions, "retrieve").mockResolvedValue(stripeSession() as unknown as Stripe.Response<Stripe.Checkout.Session>);
  const request = () => new NextRequest("http://localhost/api/stripe/session?session_id=cs_test_isolated");
  try {
    const pending = await (await sessionStatus(request())).json();
    expect(pending).toMatchObject({ paymentStatus: "paid", confirmationCode: null, bookingStatus: null });
    const booking = await reservePaidBooking(database.db, paid());
    const response = await sessionStatus(request());
    const confirmed = await response.json();
    expect(confirmed).toMatchObject({ bookingStatus: "confirmed", bookingPaymentStatus: "paid", confirmationCode: booking.confirmationCode });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(confirmed.metadata).not.toHaveProperty("email");
    expect(confirmed.metadata).not.toHaveProperty("firstName");
    await database.db.update(bookings).set({ bookingStatus: "cancelled" }).where(eq(bookings.id, booking.id));
    expect(await (await sessionStatus(request())).json()).toMatchObject({ bookingStatus: "cancelled", confirmationCode: null });
  } finally { retrieve.mockRestore(); }
});

it.runIf(Boolean(process.env.BOOKING_BROWSER_URL))("browser checkout, signed payment and real isolated reservation reach confirmed status", async () => {
  const { chromium } = await import("playwright");
  const { existsSync } = await import("node:fs");
  const base = new URL(process.env.BOOKING_BROWSER_URL!);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Local browser server required");
  const browser = await chromium.launch({ headless: true,
    channel: process.env.PLAYWRIGHT_CHANNEL ?? (!existsSync(chromium.executablePath()) && process.platform === "win32" ? "msedge" : undefined),
  });
  let simulatedSession = stripeSession();
  const create = vi.spyOn(stripe.checkout.sessions, "create").mockImplementation(async params => {
    const input = params as Stripe.Checkout.SessionCreateParams;
    simulatedSession = { ...stripeSession(), metadata: input.metadata as typeof simulatedSession.metadata,
      amount_total: (input.line_items ?? []).reduce((sum, line) => sum + (line.price_data?.unit_amount ?? 0) * (line.quantity ?? 1), 0),
    };
    return { ...simulatedSession, url: `${base.origin}/properties/st-pete-oasis/book/success?session_id=cs_test_isolated` } as unknown as Stripe.Response<Stripe.Checkout.Session>;
  });
  const retrieve = vi.spyOn(stripe.checkout.sessions, "retrieve").mockImplementation(async () => simulatedSession as unknown as Stripe.Response<Stripe.Checkout.Session>);
  try {
    // Quote from the DB, not browser-supplied pricing or today's static fallback.
    await database.db.update(properties).set({ cleaningFee: "90" }).where(eq(properties.id, propertyId));
    await writePriceLabsRate(database.db, propertyId, { date: "2030-06-02", price: 160 });
    const page = await browser.newPage();
    await page.route("**/*", async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== base.origin) return route.abort();
      let response: Response | undefined;
      if (url.pathname === "/api/stripe/checkout-session") response = await checkout(new NextRequest(url.href, {
        method: "POST", body: request.postData(), headers: { "Content-Type": "application/json" },
      }));
      else if (url.pathname === "/api/stripe/session") response = await sessionStatus(new NextRequest(url.href));
      else if (url.pathname.startsWith("/api/") || !["GET", "HEAD"].includes(request.method())) return route.abort();
      if (response) return route.fulfill({ status: response.status, contentType: "application/json", body: await response.text() });
      return route.continue();
    });
    await page.goto(`${base.origin}/properties/st-pete-oasis/book/success`);
    const response = await page.evaluate(async () => {
      const res = await fetch("/api/stripe/checkout-session", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "st-pete-oasis", firstName: "Test", lastName: "Guest", email: "guest@example.invalid",
          phone: "5551234567", checkIn: "2030-06-01", checkOut: "2030-06-04", numGuests: 2, totalAmount: 1 }),
      });
      return { status: res.status, body: await res.json() };
    });
    expect(response.status).toBe(200);
    expect(create).toHaveBeenCalledOnce();
    expect(simulatedSession.metadata.accommodationSubtotal).toBe("360");
    expect(simulatedSession.metadata.cleaningFee).toBe("90");
    await page.goto(response.body.url);
    await page.getByRole("heading", { name: "Payment Received", exact: true }).waitFor();
    expect(await page.getByText("Confirmation Code", { exact: true }).count()).toBe(0);
    const body = JSON.stringify({ id: "evt_browser", object: "event", type: "checkout.session.completed", data: { object: simulatedSession } });
    const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret: webhookSecret });
    expect((await webhook(new NextRequest(`${base.origin}/api/stripe/webhook`, { method: "POST", body, headers: { "stripe-signature": signature } }))).status).toBe(200);
    await page.getByRole("heading", { name: "Booking Confirmed!", exact: true }).waitFor();
    const [booking] = await database.db.select().from(bookings);
    expect(booking).toMatchObject({ nightlyRate: "120", cleaningFee: "90", paymentStatus: "paid", bookingStatus: "confirmed" });
    expect(Number(booking.totalAmount)).toBe(simulatedSession.amount_total / 100);
    expect(await page.getByText(booking.confirmationCode, { exact: true }).count()).toBe(1);
    expect(await database.db.select().from(availability)).toHaveLength(3);
  } finally { create.mockRestore(); retrieve.mockRestore(); await browser.close(); }
}, 60000);
