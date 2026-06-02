// schema/broadcasts.ts
import {
  bigint,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users.schema.js";

export const broadcastStatusEnum = pgEnum("broadcast_status", [
  "pending",
  "sending",
  "done",
  "failed",
]);

export const broadcasts = pgTable("broadcasts", {
  id: serial("id").primaryKey(),
  telegramId: bigint("telegram_id", { mode: "number" })
    .notNull()
    .references(() => users.telegramId),
  totalRequested: integer("total_requested").notNull(),
  totalSent: integer("total_sent").default(0).notNull(),
  status: broadcastStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export const broadcastNumberStatusEnum = pgEnum("broadcast_number_status", [
  "sent",
  "failed",
]);

export const broadcastNumbers = pgTable("broadcast_numbers", {
  id: serial("id").primaryKey(),
  broadcastId: integer("broadcast_id")
    .notNull()
    .references(() => broadcasts.id),
  phoneNumber: text("phone_number").notNull(),
  status: broadcastNumberStatusEnum("status").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Broadcast = typeof broadcasts.$inferSelect;
export type BroadcastNumber = typeof broadcastNumbers.$inferSelect;
