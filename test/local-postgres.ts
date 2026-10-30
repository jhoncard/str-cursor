import EmbeddedPostgres from "embedded-postgres";
import { randomBytes } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { createServer } from "node:net";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { generateDrizzleJson, generateMigration } from "drizzle-kit/api";
import * as schema from "../src/lib/db/schema";

/** Always creates its own loopback cluster. Never reads DATABASE_URL or .env files. */
export async function localPostgres() {
  const directory = await mkdtemp(join(tmpdir(), "str-booking-test-"));
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  const password = randomBytes(24).toString("hex");
  const cluster = new EmbeddedPostgres({
    databaseDir: join(directory, "data"), port, user: "postgres", password,
    persistent: true, createPostgresUser: false,
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => {}, onError: () => {},
  });
  const client = postgres({
    host: "127.0.0.1", port, user: "postgres", password, database: "postgres",
    max: 10, prepare: false, onnotice: () => {},
  });
  const cleanup = async () => {
    await client.end({ timeout: 3 });
    await cluster.stop();
    const rel = relative(resolve(tmpdir()), resolve(directory));
    if (!rel.startsWith("str-booking-test-") || rel.includes("..")) throw new Error("Unsafe test cleanup path");
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  };
  try {
    await cluster.initialise();
    await cluster.start();
    const statements = await generateMigration(generateDrizzleJson({}), generateDrizzleJson(schema));
    for (const statement of statements) await client.unsafe(statement);
    return { client, db: drizzle(client, { schema }), cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
