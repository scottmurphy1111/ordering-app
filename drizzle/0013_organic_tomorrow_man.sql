CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TABLE "vendor_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_hours_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"open_time" time,
	"close_time" time,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "settings" SET DEFAULT '{"currency":"USD","taxRate":0.0825,"enableTips":false,"defaultTipPercentages":[15,18,20],"allowPickup":true,"minimumOrderAmount":0,"estimatedPrepTimeMinutes":15,"asapPickupEnabled":false}'::jsonb;--> statement-breakpoint
ALTER TABLE "vendor_hours" ADD CONSTRAINT "vendor_hours_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_hours_exceptions" ADD CONSTRAINT "vendor_hours_exceptions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vendor_hours_vendor_idx" ON "vendor_hours" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_hours_exceptions_vendor_date_unique" ON "vendor_hours_exceptions" USING btree ("vendor_id","date");--> statement-breakpoint
CREATE INDEX "vendor_hours_exceptions_vendor_idx" ON "vendor_hours_exceptions" USING btree ("vendor_id");