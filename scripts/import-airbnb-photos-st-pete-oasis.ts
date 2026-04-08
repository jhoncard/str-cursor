/**
 * Download Airbnb CDN photos and upload to Supabase Storage (same flow as cozy / room paradise).
 * Order matches Airbnb PDP/gallery (document order on poolplaystpete; hosting/ paths; one uses prohost-api/).
 *
 * Requires .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * NEXT_PUBLIC_SUPABASE_PROPERTY_IMAGES_BUCKET (optional).
 *
 * Run: pnpm exec tsx scripts/import-airbnb-photos-st-pete-oasis.ts
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });

const SLUG = "st-pete-oasis";

const LISTING_PHOTO_URLS = [
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4e1c1577-4b1e-4daa-be24-5a8dcac67524.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6818848d-067d-4a68-bdce-83af2010a239.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7234682c-6e85-462e-bc40-120eff456058.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/11cfc399-17b7-4867-a6b6-2ba9b23487a0.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c6080e3d-d678-489b-a16f-beeb2214dd83.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/480e5c8c-d371-47b3-a970-a0c990ae5546.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7c343d98-4b45-44eb-87de-86277bfdef12.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5aad1a7a-b4fa-42e0-878c-bf1b03ef61d3.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c5f2e949-e1e2-4f95-831f-bbf0f527d30f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/2fec1952-326a-44d6-b051-952d0556c6f7.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8bfb0248-f817-4e64-9e1e-26b65b3d92c3.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4dd9e8eb-9e4f-44d8-92c4-5a5e30d5046f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5bd4da46-a5ea-430e-9d94-7e151754dc63.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7e6545f4-3b60-4d8f-9e6b-fb4a8794537e.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1b228779-0fe6-43e4-b1b9-63b102ebe2c9.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/66fd93db-60c0-4b47-a7d1-7db3dc8994c7.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/544a0683-81c1-4917-8dd1-b216f1d288d6.jpeg",
  "https://a0.muscache.com/im/pictures/prohost-api/Hosting-1303247562314270220/original/f672c828-3f02-4cb4-a90a-c1fdf36b1f9d.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/fa980036-ee13-4705-b49b-ecba22f74f2f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/713bd0c4-21d2-4068-aeea-243d12b77421.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/c88f2cb3-557b-450b-a6c4-25c3c3dfd9f6.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/91e4f6ac-55a3-4d06-a1c5-0f73afd1804b.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/5b911563-2459-41b3-9999-45175eef55ea.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/47fb50e8-4cc2-4cd4-b858-2f207953a13a.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/23798d06-6096-4893-8c93-c9ebccabfaa3.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a7a2c3d4-ea34-4864-ba9c-096a5aeda3c4.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/2466a4da-2e53-406e-b13d-4dc206561c76.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1f2e061b-57a3-435f-a800-ee39da531797.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/96ffc43e-7b7a-4a7d-a239-7d3395914383.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1d498961-e148-47ae-9add-8c37a3c89aa5.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/b28a1af4-2910-4423-aff2-6cb82f253e42.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/bc9d0aa7-47c0-40f3-8ee2-835d9e1f0580.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/1a6a6073-499a-402b-b49b-a200c067e3d8.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/7aafcb2f-f6ce-43a5-b89e-f64c957e9130.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/59724c5c-bc54-4688-a80f-2cd166902ab2.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/9b9ac06f-6183-484c-8fb8-2fe9b2a04462.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/4700ba1f-9007-46e9-a1d6-7b714792e5c3.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/fcb340eb-e887-43a0-9273-5ff4c1aa3d9a.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8336a77e-918d-4fe4-98d1-4bbddb7da9d9.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/19481f0e-1d5c-4b38-9449-90f74d09688e.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/69e791fb-036c-4209-b246-4782b6b98474.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6861e761-aa32-4cb8-a943-119f3544c4d3.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a13cb6c3-fcd1-4add-ae06-437ba9dffca6.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/a899a5dd-0a55-443e-b9f4-ed47b6699f3f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/003b8881-c27d-43da-975a-dbf5b01f5eee.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/8e323d7c-ccdc-4b32-83e6-79983d49a17b.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/e7b1bb3e-d518-4654-bfa8-e290a006320f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/e78ce066-a388-414e-946a-4b68e6dbdcc6.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/151e1aaf-856d-4924-b8d9-139e7ae1a143.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/6f96cf0f-2339-4b3f-8665-f3a06fafb00f.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/b1c0bec0-b714-4130-8121-d7d43a392051.jpeg",
  "https://a0.muscache.com/im/pictures/hosting/Hosting-1303247562314270220/original/30430e2f-8f14-4fd0-bedc-28d3e30c3346.jpeg",
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
