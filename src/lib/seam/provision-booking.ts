import "server-only";

import { and, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { bookings, properties } from "@/lib/db/schema";

import { seamCreateAccessCode, seamUpdateAccessCode, generateFourDigitCode } from "./access-codes";
import { computeBookingAccessWindowUtc, normalizeHHmm } from "./booking-window";
import { isSeamConfigured } from "./http";
import { extractDoorCodeFromPhone } from "./phone-to-code";

export type ProvisionSeamResult = {
  doorCode: string | null;
  seamAccessError: string | null;
};

/**
 * Create or update a Seam time-bound access code for a confirmed booking.
 * Safe to call multiple times (e.g. after admin changes check-in/out times).
 */
export async function provisionSeamAccessCodeForBooking(
  bookingId: string
): Promise<ProvisionSeamResult> {
  if (!isSeamConfigured()) {
    return { doorCode: null, seamAccessError: null };
  }

  const row = await db.query.bookings.findFirst({
    where: eq(bookings.id, bookingId),
    columns: {
      id: true,
      confirmationCode: true,
      checkIn: true,
      checkOut: true,
      bookingStatus: true,
      seamAccessCodeId: true,
      doorCode: true,
      checkInTimeOverride: true,
      checkOutTimeOverride: true,
    },
    with: {
      property: {
        columns: {
          name: true,
          seamDeviceId: true,
          checkInTime: true,
          checkOutTime: true,
          propertyTimezone: true,
        },
      },
      guest: {
        columns: {
          phone: true,
        },
      },
    },
  });

  if (!row) {
    return { doorCode: null, seamAccessError: "Booking not found." };
  }

  if (row.bookingStatus !== "confirmed") {
    await db
      .update(bookings)
      .set({ seamAccessError: null, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: row.doorCode, seamAccessError: null };
  }

  const deviceId = row.property.seamDeviceId?.trim();
  if (!deviceId) {
    await db
      .update(bookings)
      .set({ seamAccessError: null, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: null, seamAccessError: null };
  }

  const checkIn = String(row.checkIn);
  const checkOut = String(row.checkOut);
  const tz = row.property.propertyTimezone?.trim() || "America/New_York";

  // Effective check-in/out times: per-booking override if set, else property default.
  const checkInTime = normalizeHHmm(
    row.checkInTimeOverride ?? row.property.checkInTime,
    "16:00",
  );
  const checkOutTime = normalizeHHmm(
    row.checkOutTimeOverride ?? row.property.checkOutTime,
    "11:00",
  );

  let startsAt: Date;
  let endsAt: Date;
  try {
    ({ startsAt, endsAt } = computeBookingAccessWindowUtc({
      checkIn,
      checkOut,
      checkInTime,
      checkOutTime,
      timeZone: tz,
    }));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db
      .update(bookings)
      .set({ seamAccessError: msg, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: null, seamAccessError: msg };
  }

  const name = `${row.property.name} · ${row.confirmationCode}`.slice(0, 120);

  // Phone-derived code (last 4 digits). Falls back to random when the guest
  // phone is missing, too short, or a weak code like '0000'. See Task 3.
  const phoneCode = extractDoorCodeFromPhone(row.guest?.phone);

  try {
    if (row.seamAccessCodeId) {
      // Existing code: keep whatever is already stored on the booking unless
      // we have no code at all, in which case prefer phone-derived.
      const code =
        row.doorCode?.trim() || phoneCode || generateFourDigitCode();
      await seamUpdateAccessCode({
        accessCodeId: row.seamAccessCodeId,
        name,
        code,
        startsAt,
        endsAt,
      });
      await db
        .update(bookings)
        .set({
          doorCode: code,
          seamAccessError: null,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId));
      return { doorCode: code, seamAccessError: null };
    }

    // First attempt uses phone-derived code. Subsequent attempts fall back
    // to random because the collision is almost certainly another booking
    // on the same lock using the same last-4 digits.
    let code = phoneCode ?? generateFourDigitCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const created = await seamCreateAccessCode({
          deviceId,
          name,
          code,
          startsAt,
          endsAt,
        });
        await db
          .update(bookings)
          .set({
            seamAccessCodeId: created.accessCodeId,
            doorCode: created.code,
            seamAccessError: null,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, bookingId));
        return { doorCode: created.code, seamAccessError: null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("duplicate") || msg.includes("already") || msg.includes("conflict")) {
          code = generateFourDigitCode();
          continue;
        }
        throw e;
      }
    }
    throw new Error("Could not allocate a unique door code after several attempts.");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[seam] provision failed:", msg);
    await db
      .update(bookings)
      .set({ seamAccessError: msg, updatedAt: new Date() })
      .where(eq(bookings.id, bookingId));
    return { doorCode: row.doorCode, seamAccessError: msg };
  }
}

/**
 * Re-provision Seam codes for all future confirmed bookings on a property
 * (call after changing check-in/out times or timezone in admin).
 */
export async function syncSeamAccessCodesForProperty(propertyId: string): Promise<{
  ok: boolean;
  updated: number;
  message?: string;
}> {
  if (!isSeamConfigured()) {
    return { ok: true, updated: 0, message: "Seam is not configured (SEAM_API_KEY)." };
  }

  const prop = await db.query.properties.findFirst({
    where: eq(properties.id, propertyId),
    columns: { seamDeviceId: true },
  });
  if (!prop?.seamDeviceId?.trim()) {
    return { ok: true, updated: 0, message: "No Seam device ID on this property." };
  }

  const today = new Date().toISOString().slice(0, 10);

  const list = await db.query.bookings.findMany({
    where: and(
      eq(bookings.propertyId, propertyId),
      eq(bookings.bookingStatus, "confirmed"),
      gte(bookings.checkOut, today)
    ),
    columns: { id: true },
  });

  let updated = 0;
  for (const b of list) {
    await provisionSeamAccessCodeForBooking(b.id);
    updated += 1;
  }

  return { ok: true, updated };
}
