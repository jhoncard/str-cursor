import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { chromium } from "playwright";
import { spawn } from "node:child_process";

// Run against a local development server only. All status/provider responses are
// simulated, so this test cannot submit a payment or mutate the real database.
const base = new URL(process.env.BOOKING_BROWSER_URL ?? "http://127.0.0.1:3000");
if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Local server required");
const channel = process.env.PLAYWRIGHT_CHANNEL ??
  (!existsSync(chromium.executablePath()) && process.platform === "win32" ? "msedge" : undefined);
const browser = await chromium.launch({ headless: true, channel });
const initial = {
  id: "cs_test_browser", paymentStatus: "paid", bookingStatus: null, bookingPaymentStatus: null,
  confirmationCode: null, amountTotal: 39000, currency: "usd",
  metadata: { propertySlug: "st-pete-oasis", propertyName: "Test House", numGuests: "2", checkIn: "2030-06-01", checkOut: "2030-06-04" },
};
const confirmed = { ...initial, bookingStatus: "confirmed", bookingPaymentStatus: "paid", confirmationCode: "BK-BROWSER-TEST" };
const errors = [];
let checked = 0;

async function scenario(respond, test, withSession = true) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  let calls = 0;
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) return route.abort();
    if (url.pathname === "/api/stripe/session") {
      calls += 1;
      const result = respond(calls);
      return route.fulfill({ status: result.status ?? 200, json: result.body ?? result });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 503, json: { error: "External operations disabled by browser test" } });
    if (!["GET", "HEAD"].includes(route.request().method())) return route.abort();
    return route.continue();
  });
  try {
    await page.goto(`${base.origin}/properties/st-pete-oasis/book/success${withSession ? "?session_id=cs_test_browser" : ""}`, { waitUntil: "domcontentloaded" });
    await test(page, () => calls);
    checked += 1;
  } finally { await context.close(); }
}

try {
  await scenario(n => n < 2 ? initial : confirmed, async page => {
    await page.getByRole("heading", { name: "Payment Received", exact: true }).waitFor();
    assert.equal(await page.getByText("Confirmation Code", { exact: true }).count(), 0);
    await page.getByRole("heading", { name: "Booking Confirmed!", exact: true }).waitFor();
    assert.equal(await page.getByText("BK-BROWSER-TEST", { exact: true }).count(), 1);
  });
  await scenario(() => initial, async (page, calls) => {
    await page.getByRole("heading", { name: "Payment Received", exact: true }).waitFor();
    await page.getByText(/Payment received, but your reservation is not confirmed yet/).waitFor({ timeout: 40000 });
    assert.equal(calls(), 12);
    assert.equal(await page.getByRole("heading", { name: "Booking Confirmed!", exact: true }).count(), 0);
    assert.match(await page.getByRole("link", { name: "Contact Host", exact: true }).getAttribute("href"), /^mailto:/);
    assert.equal(await page.getByText("cs_test_browser", { exact: true }).count(), 1);
  });
  await scenario(() => ({ ...confirmed, bookingStatus: "cancelled", confirmationCode: null }), async (page, calls) => {
    await page.getByText(/This reservation is not currently confirmed/).waitFor();
    assert.equal(calls(), 1);
    assert.equal(await page.getByText("Confirmation Code", { exact: true }).count(), 0);
  });
  await scenario(n => n === 1 ? { status: 503, body: { error: "Temporary failure" } } : confirmed, async page => {
    await page.getByText(/We could not check your status yet/).waitFor();
    await page.getByRole("heading", { name: "Booking Confirmed!", exact: true }).waitFor();
  });
  await scenario(n => n === 1 ? { ...initial, paymentStatus: "unpaid" } : confirmed, async page => {
    await page.getByText(/Your payment is still processing/).waitFor();
    await page.getByRole("heading", { name: "Booking Confirmed!", exact: true }).waitFor();
  });
  await scenario(() => initial, async (page, calls) => {
    await page.getByText(/Missing payment reference/).waitFor();
    assert.equal(calls(), 0);
  }, false);
  assert.deepEqual(errors, [], "No browser runtime exceptions");
  console.log(`${checked} booking confirmation browser scenarios passed.`);
} finally { await browser.close(); }

// Bridge the real route handlers and a disposable PostgreSQL cluster into the
// browser for checkout -> signed webhook -> saved reservation -> confirmation.
const code = await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.booking.config.ts"], {
    stdio: "inherit", env: { ...process.env, BOOKING_BROWSER_URL: base.origin }, windowsHide: true,
  });
  child.on("error", reject);
  child.on("exit", resolve);
});
if (code !== 0) process.exitCode = code ?? 1;
