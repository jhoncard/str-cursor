/**
 * Download Airbnb CDN photos and upload to Supabase Storage (same flow as cozy / room paradise).
 * Order matches airbnb.com/h/smallhousetampa; paths are miso/ or hosting/ per file (all return 200).
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET (optional).
 *
 * Run: pnpm exec tsx scripts/import-airbnb-photos-small-house-tampa.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SLUG = "small-house-tampa";

const LISTING_PHOTO_URLS = [
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/23ebb471-87fa-42e4-b0d8-f4f822af5063.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/510160ff-252d-4c7b-9473-ad0bf4f0981e.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/4469d74b-2858-4251-a940-a72b05941fa4.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/478af77a-abf4-425c-8a45-1804a24a7e41.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/8b6df791-d34e-4ed6-be8d-0be4eab6c914.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/6805854f-3062-49a9-9066-8d1f1a4289eb.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/eba0221d-17ae-4af2-b9ca-83b4575972ee.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/82dbacc0-2af0-46bc-9a12-279f9e29a1c0.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/e9e252a1-1aab-4117-a94d-5778adad36aa.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/100d506f-40ac-48c0-b7be-a281748fcb3b.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/6517a240-b09a-4b28-b375-eb1df010c47c.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/565d2683-0cb7-4e4f-92b8-55a071cbc820.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-867478485376229516/original/8b5eb0eb-9ee9-4363-8c4c-09ead66e17b4.jpeg",
  "https://a0.muscache.com/im/pictures/miso/Hosting-867478485376229516/original/47f601fe-0de5-4599-8eb9-856e23ab336a.jpeg",
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
