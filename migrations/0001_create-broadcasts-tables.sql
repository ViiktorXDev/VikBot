CREATE TYPE "public"."broadcast_number_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."broadcast_status" AS ENUM('pending', 'sending', 'done', 'failed');--> statement-breakpoint
CREATE TABLE "broadcast_numbers" (
	"id" serial PRIMARY KEY NOT NULL,
	"broadcast_id" integer NOT NULL,
	"phone_number" text NOT NULL,
	"status" "broadcast_number_status" NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"telegram_id" bigint NOT NULL,
	"total_requested" integer NOT NULL,
	"total_sent" integer DEFAULT 0 NOT NULL,
	"status" "broadcast_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "broadcast_numbers" ADD CONSTRAINT "broadcast_numbers_broadcast_id_broadcasts_id_fk" FOREIGN KEY ("broadcast_id") REFERENCES "public"."broadcasts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcasts" ADD CONSTRAINT "broadcasts_telegram_id_users_telegram_id_fk" FOREIGN KEY ("telegram_id") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;