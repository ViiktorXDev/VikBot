import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  // environment
  NODE_ENV: z.enum(["development", "production"]).default("development"),

  // Database - Production
  PROD_DATABASE_HOST: z.string().min(1),
  PROD_DATABASE_PORT: z.coerce.number().int().positive(),
  PROD_DATABASE: z.string().min(1),
  PROD_DATABASE_USER: z.string().min(1),
  PROD_DATABASE_PASSWORD: z.string().min(1),

  // Database - Development
  DEV_DATABASE_HOST: z.string().min(1),
  DEV_DATABASE_PORT: z.coerce.number().int().positive(),
  DEV_DATABASE: z.string().min(1),
  DEV_DATABASE_USER: z.string().min(1),
  DEV_DATABASE_PASSWORD: z.string().min(1),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error("❌ Variáveis de ambiente inválidas:\n");

  for (const issue of _env.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = _env.data;

// helpers
export const isDev = env.NODE_ENV === "development";
export const isProd = env.NODE_ENV === "production";
