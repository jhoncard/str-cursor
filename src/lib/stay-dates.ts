/** Calendar-only dates in UTC; checkout is exclusive. Invalid/unbounded stays are rejected. */
export function eachStayNight(checkIn: string, checkOut: string): string[] {
  const parse = (date: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
    const time = Date.parse(`${date}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date
      ? time : NaN;
  };
  const start = parse(checkIn);
  const end = parse(checkOut);
  const count = (end - start) / 86_400_000;
  // Safety bound, not a property's minimum-stay rule.
  if (!Number.isInteger(count) || count < 1 || count > 730) return [];
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 86_400_000).toISOString().slice(0, 10));
}
