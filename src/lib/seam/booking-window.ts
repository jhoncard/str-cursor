import "server-only";

import { TZDate } from "@date-fns/tz";
import { addMinutes, subMinutes } from "date-fns";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeHHmm(raw: string | null | undefined, fallback: string): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (TIME_RE.test(s)) return s;
  // Postgres `time` or drivers may return "16:00:00"
  const short = s.slice(0, 5);
  if (TIME_RE.test(short)) return short;
  return fallback;
}

/**
 * Access code is valid from 1 hour before check-in time until 1 hour
 * after check-out time, using the property IANA timezone. This matches
 * the convention Airbnb uses in its smart-lock integrations.
 *
 * Callers are expected to resolve the effective check-in/out times
 * (property default vs. per-reservation override) before calling this
 * — the function is oblivious to where the times came from.
 */
const ACCESS_BUFFER_MINUTES = 60;

export function computeBookingAccessWindowUtc(params: {
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  timeZone: string;
}): { startsAt: Date; endsAt: Date } {
  const checkInTime = normalizeHHmm(params.checkInTime, "16:00");
  const checkOutTime = normalizeHHmm(params.checkOutTime, "11:00");
  const [iy, im, id] = params.checkIn.split("-").map(Number);
  const [ih, imin] = checkInTime.split(":").map(Number);
  const [oy, om, od] = params.checkOut.split("-").map(Number);
  const [oh, omin] = checkOutTime.split(":").map(Number);

  const checkInWall = new TZDate(iy, im - 1, id, ih, imin, params.timeZone);
  const checkOutWall = new TZDate(oy, om - 1, od, oh, omin, params.timeZone);

  const startsAt = subMinutes(checkInWall, ACCESS_BUFFER_MINUTES);
  const endsAt = addMinutes(checkOutWall, ACCESS_BUFFER_MINUTES);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Invalid access window: check-out must be after check-in.");
  }

  return { startsAt, endsAt };
}
