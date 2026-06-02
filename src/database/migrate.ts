import { config } from "dotenv";
config();

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const isProd = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: isProd
    ? process.env.PROD_DATABASE_URL
    : process.env.DEV_DATABASE_URL,
  ssl: isProd ? { rejectUnauthorized: false } : false,
});

const db = drizzle(pool);

await migrate(db, { migrationsFolder: "./migrations" });
console.log("✅ Migrations aplicadas!");
await pool.end();
