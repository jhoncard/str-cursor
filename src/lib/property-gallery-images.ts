import "server-only";

import { db } from "@/lib/db";
import { properties, propertyImages } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

/** Ordered gallery URLs from DB (e.g. Supabase Storage after import script). */
export async function getPropertyGalleryImageUrlsBySlug(
  slug: string
): Promise<string[]> {
  const rows = await db
    .select({ url: propertyImages.url })
    .from(propertyImages)
    .innerJoin(properties, eq(propertyImages.propertyId, properties.id))
    .where(eq(properties.slug, slug))
    .orderBy(asc(propertyImages.sortOrder));

  return rows.map((r) => r.url);
}
