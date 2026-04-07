import type { ListingDailyRate } from "./types";

export type { ListingDailyRate };

/**
 * Normalize various possible PriceLabs JSON shapes into { date: yyyy-MM-dd, price: number }[].
 * Adjust when you receive the exact schema from PriceLabs for your program.
 */
export function parseRatesFromUnknownPayload(data: unknown): {
  date: string;
  price: number;
}[] {
  if (!data || typeof data !== "object") return [];

  const out: { date: string; price: number }[] = [];

  const pushIfValid = (dateRaw: unknown, priceRaw: unknown) => {
    if (typeof dateRaw !== "string" || dateRaw.length < 8) return;
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) return;
    const date = dateRaw.slice(0, 10);
    out.push({ date, price: Math.round(price * 100) / 100 });
  };

  if (Array.isArray(data)) {
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      pushIfValid(
        r.date ?? r.night ?? r.stay_date,
        r.price ?? r.amount ?? r.rate ?? r.final_price
      );
    }
    return out;
  }

  const o = data as Record<string, unknown>;
  const candidates = [
    o.rates,
    o.data,
    o.calendar,
    o.prices,
    (o.data as Record<string, unknown> | undefined)?.rates,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) {
      return parseRatesFromUnknownPayload(c);
    }
  }

  return out;
}

function inferAvailable(row: Record<string, unknown>): boolean {
  if (row.unbookable === 1) return false;
  if (row.available === false) return false;
  if (row.is_available === false) return false;
  if (row.closed === true) return false;
  if (typeof row.status === "string") {
    const s = row.status.toLowerCase();
    if (["unavailable", "booked", "blocked", "closed"].includes(s)) return false;
  }
  return true;
}

function extractRawRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === "object");
  }
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const candidates = [o.rates, o.data, o.calendar, o.prices, (o.data as Record<string, unknown> | undefined)?.rates];
    for (const c of candidates) {
      if (Array.isArray(c)) return extractRawRows(c);
    }
  }
  return [];
}

/**
 * Like {@link parseRatesFromUnknownPayload} but includes nightly availability when the payload has it.
 */
export function parseListingDailyRatesFromPayload(data: unknown): ListingDailyRate[] {
  const rawRows = extractRawRows(data);
  const out: ListingDailyRate[] = [];

  if (rawRows.length > 0) {
    for (const r of rawRows) {
      const dateRaw = r.date ?? r.night ?? r.stay_date;
      if (typeof dateRaw !== "string" || dateRaw.length < 8) continue;
      const date = dateRaw.slice(0, 10);
      const priceRaw = r.price ?? r.amount ?? r.rate ?? r.final_price;
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price < 0) continue;
      out.push({
        date,
        price: Math.round(price * 100) / 100,
        available: inferAvailable(r),
      });
    }
    if (out.length > 0) {
      out.sort((a, b) => a.date.localeCompare(b.date));
      return dedupeByDateLastWins(out);
    }
  }

  const fallback = parseRatesFromUnknownPayload(data);
  return fallback.map((r) => ({ ...r, available: true }));
}

function dedupeByDateLastWins(rates: ListingDailyRate[]): ListingDailyRate[] {
  const map = new Map<string, ListingDailyRate>();
  for (const r of rates) map.set(r.date, r);
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
}

/**
 * Customer API `POST /v1/listing_prices` returns a JSON array of listing result objects.
 * See PriceLabs Swagger: Prices → listing_prices.
 */
export function parseCustomerApiListingPricesResponse(
  data: unknown,
  listingId: string
): ListingDailyRate[] {
  if (!Array.isArray(data)) return [];

  let item = data.find(
    (x) => x && typeof x === "object" && String((x as Record<string, unknown>).id) === listingId
  ) as Record<string, unknown> | undefined;

  if (!item && data.length === 1 && data[0] && typeof data[0] === "object") {
    item = data[0] as Record<string, unknown>;
  }

  if (!item) return [];

  const err = item.error;
  const errStatus = item.error_status;
  if (typeof err === "string" && err.trim()) {
    if (errStatus === "LISTING_NOT_PRESENT") {
      throw new Error(
        `PriceLabs: This listing id is not in the account tied to your API key, or the PMS does not match. ` +
          `Confirm the id in PriceLabs (same workspace as Settings → API) and try again. (${listingId})`
      );
    }
    if (errStatus === "LISTING_TOGGLE_OFF") {
      throw new Error(
        `PriceLabs: Sync must be ON for this listing before the API can return prices (LISTING_TOGGLE_OFF). ` +
          `In PriceLabs: Multi-Calendar or Pricing Dashboard, find this listing, turn Sync on, then Save and Refresh. ` +
          `Wait 1–2 minutes, then sync again. If it still fails, confirm the listing ID matches the row where Sync is on.`
      );
    }
    throw new Error(
      `PriceLabs: ${err.trim()}${typeof errStatus === "string" ? ` (${errStatus})` : ""}`
    );
  }

  const rows = item.data;
  if (!Array.isArray(rows)) return [];

  const out: ListingDailyRate[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const dateRaw = r.date;
    if (typeof dateRaw !== "string" || dateRaw.length < 8) continue;
    const date = dateRaw.slice(0, 10);
    const priceRaw = r.price;
    const price = Number(priceRaw);
    if (!Number.isFinite(price) || price < 0) continue;
    out.push({
      date,
      price: Math.round(price * 100) / 100,
      available: inferAvailable(r),
    });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return dedupeByDateLastWins(out);
}
