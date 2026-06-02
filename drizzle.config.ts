/// <reference types="node" />
import { defineConfig } from "drizzle-kit";
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schemas/index.ts",
  out: "./migrations",
  dbCredentials: {
    host: isProd
      ? process.env.PROD_DATABASE_HOST!
      : process.env.DEV_DATABASE_HOST!,
    user: isProd
      ? process.env.PROD_DATABASE_USER!
      : process.env.DEV_DATABASE_USER!,
    password: isProd
      ? process.env.PROD_DATABASE_PASSWORD!
      : process.env.DEV_DATABASE_PASSWORD!,
    database: isProd ? process.env.PROD_DATABASE! : process.env.DEV_DATABASE!,
    port:
      Number(
        isProd ? process.env.PROD_DATABASE_PORT : process.env.DEV_DATABASE_PORT,
      ) || 6543,
    ssl: isProd ? "require" : false,
  },
});
