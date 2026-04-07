// NOTE: this file is client-safe. Do NOT import "server-only" or any
// module from src/lib/supabase or src/lib/db here — those are server
// modules and will break the client bundle.

import imageCompression from "browser-image-compression";

/**
 * Resize and re-encode an uploaded photo in the browser before it is
 * sent to the server. Produces a WebP file ≤ ~500 KB with the longest
 * edge clamped to 2000 px, which is sharp on both phone and laptop
 * displays (including retina) while staying well under the server's
 * 3 MB validator cap and Next.js Server Action body limit.
 *
 * EXIF metadata (including GPS coordinates baked in by phone cameras)
 * is stripped as a side effect of the re-encode.
 *
 * Fails loudly on formats the browser cannot decode in a <canvas>,
 * most notably HEIC/HEIF from iPhones that haven't been set to save
 * in "Most Compatible" mode. Callers should surface the error message
 * to the admin rather than silently uploading the original.
 *
 * See feature doc Task 2.
 */
const TARGET_LONGEST_EDGE_PX = 2000;
const TARGET_QUALITY = 0.82;
const SAFETY_MAX_SIZE_MB = 1.5;

export async function compressPropertyImage(file: File): Promise<File> {
  // Fast path: tiny already-compressed files pass through unchanged.
  // Guards against double-compressing an image that was already optimized.
  if (file.size < 300 * 1024 && /^image\/(webp|jpeg)$/.test(file.type)) {
    return file;
  }

  // HEIC/HEIF cannot be decoded by <canvas>. Fail early with a clear
  // message so the admin knows what to do instead of seeing a generic
  // "Upload failed."
  const lowerName = file.name.toLowerCase();
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lowerName.endsWith(".heic") ||
    lowerName.endsWith(".heif")
  ) {
    throw new Error(
      "iPhone HEIC photos aren't supported. On your iPhone go to Settings → Camera → Formats → Most Compatible, then retake the photo. Or export as JPEG from Photos.",
    );
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: SAFETY_MAX_SIZE_MB,
    maxWidthOrHeight: TARGET_LONGEST_EDGE_PX,
    initialQuality: TARGET_QUALITY,
    fileType: "image/webp",
    useWebWorker: true,
    alwaysKeepResolution: false,
  });

  // browser-image-compression returns a Blob in some environments.
  // Ensure we always hand back a real File with a sensible name so the
  // server-side sanitizeImageFileName gets something to work with.
  if (compressed instanceof File) {
    return compressed;
  }
  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([compressed], `${base}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
