import { bigint, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const keyStatusEnum = pgEnum("key_status", [
  "active",
  "used",
  "expired",
  "revoked",
]);

export const keys = pgTable("keys", {
  code: text("code").primaryKey().notNull(), // "ABC-123-XYZ"
  status: keyStatusEnum("status").default("active").notNull(),

  usedBy: bigint("used_by", { mode: "number" }).references(
    () => users.telegramId,
  ),
  usedAt: timestamp("used_at", { withTimezone: true }),

  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Key = typeof keys.$inferSelect;
export type NewKey = typeof keys.$inferInsert;
