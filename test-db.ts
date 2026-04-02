import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);
async function run() {
  const result = await db.execute('SELECT count(*) FROM properties');
  console.log('Properties count:', result);
  process.exit(0);
}
run();
