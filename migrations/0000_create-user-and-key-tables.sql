CREATE TYPE "public"."key_status" AS ENUM('active', 'used', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "keys" (
	"code" text PRIMARY KEY NOT NULL,
	"status" "key_status" DEFAULT 'active' NOT NULL,
	"used_by" bigint,
	"used_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"telegram_id" bigint PRIMARY KEY NOT NULL,
	"username" text,
	"first_name" text,
	"last_name" text,
	"language_code" text,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_authorized" boolean DEFAULT false NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "keys" ADD CONSTRAINT "keys_used_by_users_telegram_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."users"("telegram_id") ON DELETE no action ON UPDATE no action;