CREATE TYPE "public"."notification_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "vendor_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"category" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" "notification_severity" DEFAULT 'info' NOT NULL,
	"action_url" text,
	"action_label" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "notification_prefs" jsonb DEFAULT '{"emailOptOuts":[],"marketingOptIn":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_notifications_vendor_idx" ON "vendor_notifications" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "vendor_notifications_unread_idx" ON "vendor_notifications" USING btree ("vendor_id","read_at");