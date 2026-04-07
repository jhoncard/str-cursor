import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { addDays, format } from "date-fns";
import { isNotNull } from "drizzle-orm";

import { client, db } from "../src/lib/db/connection";
import { properties } from "../src/lib/db/schema";
import { fetchListingRatesUncached } from "../src/lib/pricelabs/listing-rates";

async function main() {
  const rows = await db.query.properties.findMany({
    where: isNotNull(properties.pricelabsListingId),
    columns: {
      id: true,
      slug: true,
      name: true,
      pricelabsListingId: true,
    },
  });

  if (rows.length === 0) {
    console.log("No properties with pricelabs_listing_id set. Add IDs in Supabase and retry.");
    return;
  }

  const from = format(new Date(), "yyyy-MM-dd");
  const to = format(addDays(new Date(), 30), "yyyy-MM-dd");

  for (const row of rows) {
    const listingId = row.pricelabsListingId!.trim();
    console.log("\n---");
    console.log(`Name: ${row.name}`);
    console.log(`Slug: ${row.slug}`);
    console.log(`PriceLabs listing ID: ${listingId}`);
    console.log(`Range: ${from} → ${to}`);

    try {
      const rates = await fetchListingRatesUncached(listingId, from, to);
      console.log(`Nights returned: ${rates.length}`);
      console.log("Sample rates (up to 8):", rates.slice(0, 8));
    } catch (e) {
      console.error("Error:", e instanceof Error ? e.message : e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 }).catch(() => undefined);
    process.exit(process.exitCode ?? 0);
  });
