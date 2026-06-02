import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "process";
import * as dbSchema from "../database/schemas/index.js";
const isProd = env.NODE_ENV === "production";

const pool = new Pool({
  host: isProd ? env.PROD_DATABASE_HOST : env.DEV_DATABASE_HOST,

  user: isProd ? env.PROD_DATABASE_USER : env.DEV_DATABASE_USER,

  password: isProd ? env.PROD_DATABASE_PASSWORD : env.DEV_DATABASE_PASSWORD,

  database: isProd ? env.PROD_DATABASE : env.DEV_DATABASE,

  port: Number(isProd ? env.PROD_DATABASE_PORT : env.DEV_DATABASE_PORT),

  ssl: isProd
    ? {
        rejectUnauthorized: false,
      }
    : false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 60_000,

  min: 1,

  idleTimeoutMillis: 10 * 60 * 1000,
});

export const db = drizzle(pool, { schema: dbSchema });

export { pool };
