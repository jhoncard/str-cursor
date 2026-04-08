/**
 * Download listing photos from Airbnb CDN URLs and upload to Supabase
 * for property slug cozy-room-tampa (Private entrance Cozy room Tampa).
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET (optional, default property-images).
 *
 * Run: pnpm exec tsx scripts/import-airbnb-photos-cozy-tampa.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SLUG = "cozy-room-tampa";

/** Extracted from https://www.airbnb.com/h/tampacoziness (Hosting-661775679127614795). */
const LISTING_PHOTO_URLS = [
  "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/3db32537-3c90-4ab3-8f76-c64b3a1a5b8f.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/3212e089-7304-4a52-98d7-53b72ce91566.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/f1102b35-b5cd-4163-a875-dd1848bf2397.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/84efab22-148d-47d9-a996-1f0492591b63.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-661775679127614795/original/064558eb-4185-4549-b433-1c8da8a58707.jpeg",
];

function sanitizeFileName(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  return base || "image.jpg";
}

function storagePath(propertyId: string, fileName: string): string {
  const id = globalThis.crypto.randomUUID();
  return `${propertyId}/${id}-${sanitizeFileName(fileName)}`;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET ?? "property-images";

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  const supabase = createClient(url, key);

  const { data: prop, error: propErr } = await supabase
    .from("properties")
    .select("id, name")
    .eq("slug", SLUG)
    .single();

  if (propErr || !prop) {
    throw new Error(
      `Property not found for slug "${SLUG}": ${propErr?.message ?? "no row"}`
    );
  }

  const propertyId = prop.id as string;
  console.log("Property:", prop.name, propertyId);

  const { data: maxRow } = await supabase
    .from("property_images")
    .select("sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hadExisting = maxRow != null && maxRow.sort_order != null;
  let order = (maxRow?.sort_order ?? -1) + 1;

  for (let i = 0; i < LISTING_PHOTO_URLS.length; i++) {
    const src = LISTING_PHOTO_URLS[i];
    const fileName = src.split("/").pop() ?? `photo-${i + 1}.jpeg`;
    const res = await fetch(src);
    if (!res.ok) {
      throw new Error(`Failed to download ${src}: ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const path = storagePath(propertyId, fileName);
    const contentType = res.headers.get("content-type") || "image/jpeg";

    const { error: upErr } = await supabase.storage
      .from(bucket)
      .upload(path, buf, { contentType, upsert: false });

    if (upErr) {
      throw new Error(`Storage upload failed: ${upErr.message}`);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    const { error: insErr } = await supabase.from("property_images").insert({
      property_id: propertyId,
      url: publicUrl,
      alt_text: `${prop.name} – photo ${i + 1}`,
      sort_order: order,
      is_cover: !hadExisting && i === 0,
    });

    if (insErr) {
      throw new Error(`property_images insert failed: ${insErr.message}`);
    }

    console.log(`Uploaded`, i + 1, "/", LISTING_PHOTO_URLS.length, publicUrl);
    order += 1;
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
