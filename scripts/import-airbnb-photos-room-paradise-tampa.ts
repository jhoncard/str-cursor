/**
 * Download listing photos from Airbnb CDN and upload to Supabase Storage,
 * same flow as import-airbnb-photos-cozy-tampa.ts.
 *
 * Listing HTML uses /im/pictures/hosting/... (not /miso/) for this property.
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET (optional, default property-images).
 *
 * Run: pnpm exec tsx scripts/import-airbnb-photos-room-paradise-tampa.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SLUG = "room-paradise-tampa";

/** Same order as airbnb.com/h/tamparoomparadaise (cover first). hosting/ not miso/. */
const LISTING_PHOTO_URLS = [
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/42134967-bdfd-4edc-af42-45c8b53afdeb.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/1271dd5a-ccba-46ab-9735-e9a70a6704b8.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f16b9a45-298c-451c-849b-127e9b8166f1.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/660047be-2519-4d28-8d3c-ce99496b77b7.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f87f5c9b-cf75-4a1a-a1d8-d3cfd1929bbf.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/9f4121bf-24f9-4157-b0b5-7c1bd6fe2c8d.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/842c9d5f-f3d2-4567-a7d7-9d0adcac2435.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/210a7cd6-8e70-472f-be1a-2cc9c11731db.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/50897723-e21e-40c7-9f39-b14822a23977.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f41ee471-c208-4684-9a4c-ab4de8db0089.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/4fc9d56c-345c-4a7f-8fc9-81bf8b4dfd83.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/f7f6829e-9ca1-41d0-b657-6cd0aeec0a97.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/3318cc7b-59ef-43ef-a0e5-136ac9ec8da9.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1153123371328664139/original/6a998c35-ea0c-4848-818f-c06cd40372c9.jpeg",
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

  await supabase.from("property_images").delete().eq("property_id", propertyId);

  let order = 0;
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
      is_cover: i === 0,
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
