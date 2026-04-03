"use server";

import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  PROPERTY_IMAGES_BUCKET,
  assertImagePropertyImage,
  buildPropertyImageStoragePath,
  createServiceRoleSupabase,
  extractStoragePathFromPublicUrl,
} from "@/lib/supabase/property-image-upload";

export async function updateProperty(
  propertyId: string,
  data: {
    name?: string;
    description?: string;
    short_description?: string;
    base_price_night?: number;
    max_guests?: number;
    status?: string;
  }
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("properties")
    .update(data)
    .eq("id", propertyId);

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function addPropertyImage(
  propertyId: string,
  url: string,
  altText: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: maxOrder } = await supabase
    .from("property_images")
    .select("sort_order")
    .eq("property_id", propertyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrder?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("property_images").insert({
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
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("property_images")
    .select("url")
    .eq("id", imageId)
    .maybeSingle();

  const storagePath =
    row?.url ? extractStoragePathFromPublicUrl(row.url) : null;
  if (storagePath) {
    const storageClient = createServiceRoleSupabase() ?? supabase;
    await storageClient.storage
      .from(PROPERTY_IMAGES_BUCKET)
      .remove([storagePath]);
  }

  const { error } = await supabase
    .from("property_images")
    .delete()
    .eq("id", imageId);

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

  assertImagePropertyImage(file);

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
