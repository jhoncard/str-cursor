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
 * Access code is valid from 30 minutes before check-in time until 30 minutes after check-out time,
 * using the property IANA timezone.
 */
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

  const startsAt = subMinutes(checkInWall, 30);
  const endsAt = addMinutes(checkOutWall, 30);

  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new Error("Invalid access window: check-out must be after check-in.");
  }

  return { startsAt, endsAt };
}
