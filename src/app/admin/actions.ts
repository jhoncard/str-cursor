"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  PROPERTY_IMAGES_BUCKET,
  assertImagePropertyImage,
  assertRentalAgreementPdf,
  buildPropertyImageStoragePath,
  buildPropertyRentalPdfStoragePath,
  createServiceRoleSupabase,
  extractStoragePathFromPublicUrl,
} from "@/lib/supabase/property-image-upload";

export async function updateProperty(
  propertyId: string,
  data: {
    name?: string;
    description?: string;
    guest_contract_pdf_url?: string | null;
    pricelabs_listing_id?: string | null;
    short_description?: string;
    base_price_night?: number;
    max_guests?: number;
    status?: string;
    check_in_time?: string;
    check_out_time?: string;
    timezone?: string;
    seam_device_id?: string | null;
  }
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase
    .from("properties")
    .select("check_in_time, check_out_time, timezone, seam_device_id")
    .eq("id", propertyId)
    .maybeSingle();

  const { data: updated, error } = await supabase
    .from("properties")
    .update(data)
    .eq("id", propertyId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!updated?.length) {
    throw new Error(
      "Could not save changes. Sign in as an admin or refresh the page and try again.",
    );
  }

  const accessChanged =
    before != null &&
    ((data.check_in_time !== undefined &&
      String(data.check_in_time) !== String(before.check_in_time ?? "")) ||
      (data.check_out_time !== undefined &&
        String(data.check_out_time) !== String(before.check_out_time ?? "")) ||
      (data.timezone !== undefined &&
        String(data.timezone) !== String(before.timezone ?? "")) ||
      (data.seam_device_id !== undefined &&
        String(data.seam_device_id ?? "") !== String(before.seam_device_id ?? "")));

  if (accessChanged) {
    const { syncSeamAccessCodesForProperty } = await import(
      "@/lib/seam/provision-booking"
    );
    await syncSeamAccessCodesForProperty(propertyId);
  }

  return { success: true };
}

/** Re-push Seam access code windows for all future confirmed stays (after changing times or lock). */
export async function syncSeamAccessCodesForPropertyAction(propertyId: string) {
  await requireAdmin();
  const { syncSeamAccessCodesForProperty } = await import(
    "@/lib/seam/provision-booking"
  );
  return syncSeamAccessCodesForProperty(propertyId);
}

/**
 * Update a single reservation's per-booking check-in / check-out time
 * overrides and re-provision its Seam access code window. Empty string
 * in either field clears the override (reverts to property default).
 *
 * See feature doc Task 7.
 */
export async function updateBookingTimeOverrides(
  bookingId: string,
  data: {
    checkInTimeOverride: string;
    checkOutTimeOverride: string;
  },
) {
  await requireAdmin();
  const { db } = await import("@/lib/db");
  const { bookings } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");

  const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
  const normalize = (raw: string): string | null => {
    const s = raw.trim();
    if (s === "") return null;
    if (!TIME_RE.test(s)) {
      throw new Error(`Invalid time format: "${s}". Use HH:mm (e.g. 14:00).`);
    }
    return s;
  };

  const checkInTimeOverride = normalize(data.checkInTimeOverride);
  const checkOutTimeOverride = normalize(data.checkOutTimeOverride);

  const result = await db
    .update(bookings)
    .set({
      checkInTimeOverride,
      checkOutTimeOverride,
      updatedAt: new Date(),
    })
    .where(eq(bookings.id, bookingId))
    .returning({ id: bookings.id });

  if (result.length === 0) {
    throw new Error("Reservation not found.");
  }

  // Push the new window to the smart lock. Safe to call when Seam is not
  // configured — provisionSeamAccessCodeForBooking no-ops in that case.
  const { provisionSeamAccessCodeForBooking } = await import(
    "@/lib/seam/provision-booking"
  );
  const seam = await provisionSeamAccessCodeForBooking(bookingId);

  return {
    success: true,
    doorCode: seam.doorCode,
    seamAccessError: seam.seamAccessError,
  };
}

/** Pull nightly rates from PriceLabs into `availability.price_override` (requires env + listing ID). */
export async function syncPriceLabsRatesForPropertyAction(propertyId: string) {
  await requireAdmin();
  const { syncPriceLabsRatesForProperty } = await import("@/lib/pricelabs/sync-rates");
  return syncPriceLabsRatesForProperty(propertyId);
}

export async function addPropertyImage(
  propertyId: string,
  url: string,
  altText: string
) {
  await requireAdmin();
  const db = createServiceRoleSupabase() ?? (await createClient());

  const { data: maxOrder } = await db
    .from("property_images")
    .select("sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { error } = await db.from("property_images").insert({
    property_id: propertyId,
    url,
    alt_text: altText,
    sort_order: nextOrder,
    is_cover: nextOrder === 0,
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function deletePropertyImage(imageId: string) {
  await requireAdmin();
  const db = createServiceRoleSupabase() ?? (await createClient());

  const { data: row } = await db
    .from("property_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  const storagePath =
    row?.url ? extractStoragePathFromPublicUrl(row.url) : null;
  if (storagePath) {
    const storageClient = createServiceRoleSupabase() ?? db;
    await storageClient.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .remove([storagePath]);
  }

  const { error } = await db.from("property_images").delete().eq("id", imageId);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function uploadPropertyImageFile(formData: FormData) {
  await requireAdmin();

  const propertyId = formData.get("propertyId");
  const rawAlt = formData.get("altText");
  const file = formData.get("file");

  if (typeof propertyId !== "string" || !propertyId.trim()) {
    throw new Error("Missing property.");
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a file to upload.");
  }

  await assertImagePropertyImage(file);

  const altText =
    typeof rawAlt === "string" && rawAlt.trim()
      ? rawAlt.trim()
      : file.name.replace(/\.[^.]+$/, "") || "Photo";

  const path = buildPropertyImageStoragePath(propertyId.trim(), file.name);
  const uploadClient = createServiceRoleSupabase() ?? (await createClient());

  const { error: uploadError } = await uploadClient.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = uploadClient.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);

  await addPropertyImage(propertyId.trim(), publicUrl, altText);
  return { success: true, url: publicUrl };
}

export async function uploadPropertyRentalAgreementPdf(formData: FormData) {
  await requireAdmin();

  const propertyId = formData.get("propertyId");
  const file = formData.get("file");

  if (typeof propertyId !== "string" || !propertyId.trim()) {
    throw new Error("Missing property.");
  }
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a PDF to upload.");
  }

  await assertRentalAgreementPdf(file);

  const supabase = await createClient();
  const pid = propertyId.trim();

  const { data: row, error: fetchErr } = await supabase
    .from("properties")
    .select("guest_contract_pdf_url")
    .eq("id", pid)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);

  const oldUrl = row?.guest_contract_pdf_url as string | null | undefined;
  if (oldUrl) {
    const oldPath = extractStoragePathFromPublicUrl(oldUrl);
    if (oldPath) {
      const storageClient = createServiceRoleSupabase() ?? supabase;
      await storageClient.storage
        .from(PROPERTY_IMAGES_BUCKET)
        .remove([oldPath]);
    }
  }

  const path = buildPropertyRentalPdfStoragePath(pid);
  const uploadClient = createServiceRoleSupabase() ?? supabase;

  const { error: uploadError } = await uploadClient.storage
    .from(PROPERTY_IMAGES_BUCKET)
    .upload(path, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) throw new Error(uploadError.message);

  const {
    data: { publicUrl },
  } = uploadClient.storage.from(PROPERTY_IMAGES_BUCKET).getPublicUrl(path);

  const { data: updatedRows, error: updateErr } = await supabase
    .from("properties")
    .update({ guest_contract_pdf_url: publicUrl })
    .eq("id", pid)
    .select("id");

  if (updateErr) throw new Error(updateErr.message);
  if (!updatedRows?.length) {
    throw new Error(
      "Could not save the PDF link to the property. Ensure you are logged in as an admin and try again.",
    );
  }

  return { success: true, url: publicUrl };
}

export async function removePropertyRentalAgreementPdf(propertyId: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: row, error: fetchErr } = await supabase
    .from("properties")
    .select("guest_contract_pdf_url")
    .eq("id", propertyId)
    .maybeSingle();

  if (fetchErr) throw new Error(fetchErr.message);

  const url = row?.guest_contract_pdf_url as string | null | undefined;
  if (url) {
    const storagePath = extractStoragePathFromPublicUrl(url);
    if (storagePath) {
      const storageClient = createServiceRoleSupabase() ?? supabase;
      await storageClient.storage
        .from(PROPERTY_IMAGES_BUCKET)
        .remove([storagePath]);
    }
  }

  const { data: cleared, error } = await supabase
    .from("properties")
    .update({ guest_contract_pdf_url: null })
    .eq("id", propertyId)
    .select("id");

  if (error) throw new Error(error.message);
  if (!cleared?.length) {
    throw new Error(
      "Could not update the property. Ensure you are logged in as an admin.",
    );
  }
  return { success: true };
}

const ICAL_SOURCE_OPTIONS = [
  "airbnb",
  "vrbo",
  "booking_com",
  "other",
] as const;

function unfoldIcsLines(ics: string): string[] {
  return ics
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/)
    .map((line) => line.trim());
}

function parseIcsDate(raw: string): Date | null {
  const value = raw.trim();
  if (/^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    return new Date(Date.UTC(y, m - 1, d));
  }
  if (/^\d{8}T\d{6}Z$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }
  if (/^\d{8}T\d{6}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    const hh = Number(value.slice(9, 11));
    const mm = Number(value.slice(11, 13));
    const ss = Number(value.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }
  return null;
}

function lineValueDate(line: string): Date | null {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  return parseIcsDate(line.slice(idx + 1));
}

function eachNightInStay(checkIn: Date, checkOut: Date): string[] {
  const dates: string[] = [];
  const current = new Date(checkIn);
  const end = new Date(checkOut);
  current.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  while (current < end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function extractBlockedNightsFromIcs(ics: string): string[] {
  const lines = unfoldIcsLines(ics);
  const blocked: string[] = [];
  let inEvent = false;
  let start: Date | null = null;
  let end: Date | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      start = null;
      end = null;
      continue;
    }
    if (line === "END:VEVENT") {
      if (inEvent && start && end) blocked.push(...eachNightInStay(start, end));
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    if (line.startsWith("DTSTART")) start = lineValueDate(line);
    if (line.startsWith("DTEND")) end = lineValueDate(line);
  }

  return [...new Set(blocked)];
}

async function syncFeedBlockedDates(
  feedId: string,
  propertyId: string,
  feedUrl: string
) {
  const supabase = await createClient();
  const res = await fetch(feedUrl, {
    headers: { "user-agent": "FeathersHousesIcalSync/1.0" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Could not fetch iCal feed (${res.status}).`);
  }
  const text = await res.text();
  const nights = extractBlockedNightsFromIcs(text);

  const { error: deleteErr } = await supabase
    .from("property_ical_blocked_dates")
    .delete()
    .eq("ical_feed_id", feedId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (nights.length > 0) {
    const chunk = 500;
    for (let i = 0; i < nights.length; i += chunk) {
      const batch = nights.slice(i, i + chunk).map((date) => ({
        ical_feed_id: feedId,
        property_id: propertyId,
        blocked_date: date,
      }));
      const { error: insErr } = await supabase
        .from("property_ical_blocked_dates")
        .insert(batch);
      if (insErr) throw new Error(insErr.message);
    }
  }

  const { error: updateErr } = await supabase
    .from("property_ical_feeds")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("id", feedId);
  if (updateErr) throw new Error(updateErr.message);

  return nights.length;
}

export async function addPropertyIcalFeed(
  propertyId: string,
  feedUrl: string,
  source: string
) {
  await requireAdmin();
  const supabase = await createClient();
  const url = feedUrl.trim();
  if (!url) throw new Error("Calendar URL is required.");

  const normalized = ICAL_SOURCE_OPTIONS.includes(
    source as (typeof ICAL_SOURCE_OPTIONS)[number]
  )
    ? source
    : "other";

  const { data: existing, error: existingError } = await supabase
    .from("property_ical_feeds")
    .select("id")
    .eq("property_id", propertyId)
    .eq("feed_url", url)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) {
    throw new Error("This iCalendar URL is already added for this property.");
  }

  const { data: row, error } = await supabase
    .from("property_ical_feeds")
    .insert({
      property_id: propertyId,
      feed_url: url,
      source: normalized,
    })
    .select("id")
    .single();
  if (error || !row?.id) {
    if (error?.code === "23505") {
      throw new Error("This iCalendar URL is already added for this property.");
    }
    throw new Error(error?.message ?? "Could not save calendar feed.");
  }

  const count = await syncFeedBlockedDates(row.id, propertyId, url);
  return { feedId: row.id, nightsBlocked: count };
}

export async function deletePropertyIcalFeed(feedId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("property_ical_feeds").delete().eq("id", feedId);
  if (error) throw new Error(error.message);
}

export async function syncPropertyIcalFeedNow(feedId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: feed, error } = await supabase
    .from("property_ical_feeds")
    .select("id, property_id, feed_url")
    .eq("id", feedId)
    .single();
  if (error || !feed) throw new Error(error?.message ?? "Feed not found.");

  const count = await syncFeedBlockedDates(feed.id, feed.property_id, feed.feed_url);
  return { nightsBlocked: count };
}

export async function regeneratePropertyIcalExportToken(propertyId: string) {
  await requireAdmin();
  const token = globalThis.crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({
      ical_export_token: token,
      updated_at: new Date().toISOString(),
    })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  return { icalExportToken: token };
}
