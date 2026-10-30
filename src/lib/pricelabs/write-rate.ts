import "server-only";
import { sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/lib/db/schema";

const { availability } = schema;

/** One atomic upsert: a pricing refresh cannot replace a reservation/manual block. */
export async function writePriceLabsRate(
  database: PostgresJsDatabase<typeof schema>,
  propertyId: string,
  rate: { date: string; price: number; available?: boolean },
) {
  const protectedNight = sql`${availability.status} = 'booked' or
    (${availability.status} = 'blocked' and ${availability.source} <> 'pricelabs')`;
  await database.insert(availability).values({
    propertyId, date: rate.date.slice(0, 10), priceOverride: String(rate.price),
    status: rate.available === false ? "blocked" : "available", source: "pricelabs",
  }).onConflictDoUpdate({
    target: [availability.propertyId, availability.date],
    set: {
      priceOverride: String(rate.price),
      // Rate-only webhooks carry no availability information.
      status: rate.available === undefined ? availability.status : sql`case
        when ${protectedNight} then ${availability.status} else excluded.status end`,
      source: sql`case when ${protectedNight} then ${availability.source} else excluded.source end`,
      updatedAt: new Date(),
    },
  });
}
