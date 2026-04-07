import "server-only";

import { createClient } from "@supabase/supabase-js";

function newUuid(): string {
  return globalThis.crypto.randomUUID();
}

export const PROPERTY_IMAGES_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET ?? "property-images";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RENTAL_PDF_BYTES = 15 * 1024 * 1024;

export function sanitizeImageFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "image.jpg";
}

export function buildPropertyImageStoragePath(
  propertyId: string,
  fileName: string
): string {
  return `${propertyId}/${newUuid()}-${sanitizeImageFileName(fileName)}`;
}

/**
 * Verify file content against known magic bytes. Returns the detected
 * MIME type, or null if the format is not on the allow-list.
 *
 * Security: this is what blocks SVG (which would otherwise pass a
 * "starts with image/" check and execute scripts when served from the
 * public bucket). See security audit Finding #8 (CWE-434, CWE-79).
 */
async function detectAllowedImageType(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47 &&
    header[4] === 0x0d && header[5] === 0x0a && header[6] === 0x1a && header[7] === 0x0a
  ) {
    return "image/png";
  }
  // GIF87a / GIF89a: 47 49 46 38 (37|39) 61
  if (
    header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38 &&
    (header[4] === 0x37 || header[4] === 0x39) && header[5] === 0x61
  ) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP (52 49 46 46 .. .. .. .. 57 45 42 50)
  if (
    header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
    header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function assertImagePropertyImage(file: File): Promise<void> {
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
  const detected = await detectAllowedImageType(file);
  if (!detected) {
    throw new Error(
      "Please choose a JPEG, PNG, WebP, or GIF image. SVG and other formats are not supported.",
    );
  }
}

export async function assertRentalAgreementPdf(file: File): Promise<void> {
  if (file.size > MAX_RENTAL_PDF_BYTES) {
    throw new Error("PDF must be 15MB or smaller.");
  }
  // PDF magic bytes: %PDF- = 25 50 44 46 2D
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d;
  if (!isPdf) {
    throw new Error("File does not appear to be a valid PDF.");
  }
}

/** Stored next to images: `{propertyId}/rental-agreement-{uuid}.pdf` */
export function buildPropertyRentalPdfStoragePath(propertyId: string): string {
  return `${propertyId.trim()}/rental-agreement-${newUuid()}.pdf`;
}

/** Server-only: bypasses Storage RLS when set in env. */
export function createServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function extractStoragePathFromPublicUrl(url: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  const prefix = `${base.replace(/\/$/, "")}/storage/v1/object/public/${PROPERTY_IMAGES_BUCKET}/`;
  if (!url.startsWith(prefix)) return null;
  try {
    return decodeURIComponent(url.slice(prefix.length));
  } catch {
    return null;
  }
}
