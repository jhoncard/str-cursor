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

export function assertImagePropertyImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file (JPEG, PNG, WebP, etc.).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 10MB or smaller.");
  }
}

export function assertRentalAgreementPdf(file: File) {
  const okType =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");
  if (!okType) {
    throw new Error("Please upload a PDF file.");
  }
  if (file.size > MAX_RENTAL_PDF_BYTES) {
    throw new Error("PDF must be 15MB or smaller.");
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
