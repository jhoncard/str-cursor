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
