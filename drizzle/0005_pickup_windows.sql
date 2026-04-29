-- Phase 1: Pickup Windows schema
-- Adds: vendors.timezone, pickup_locations, pickup_window_templates, pickup_windows tables,
-- and pickup_window_id, pickup_location_id, pickup_window_snapshot to orders.
-- Note: order_status.scheduled enum value is in the preceding migration (0004).

ALTER TABLE "vendors" ADD COLUMN "timezone" text NOT NULL DEFAULT 'America/New_York';
--> statement-breakpoint

CREATE TABLE "pickup_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" jsonb,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "pickup_window_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"location_id" integer,
	"name" text NOT NULL,
	"recurrence" text NOT NULL,
	"window_start" time NOT NULL,
	"window_end" time NOT NULL,
	"cutoff_hours" integer DEFAULT 48 NOT NULL,
	"max_orders" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE "pickup_windows" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"vendor_id" integer NOT NULL,
	"location_id" integer,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cutoff_at" timestamp with time zone NOT NULL,
	"max_orders" integer,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_windows_template_starts_unique" UNIQUE("template_id","starts_at")
);
--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN "pickup_window_id" integer;
--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN "pickup_location_id" integer;
--> statement-breakpoint

ALTER TABLE "orders" ADD COLUMN "pickup_window_snapshot" jsonb;
--> statement-breakpoint

ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_vendor_id_vendors_id_fk"
	FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "pickup_window_templates" ADD CONSTRAINT "pickup_window_templates_vendor_id_vendors_id_fk"
	FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "pickup_window_templates" ADD CONSTRAINT "pickup_window_templates_location_id_pickup_locations_id_fk"
	FOREIGN KEY ("location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_template_id_pickup_window_templates_id_fk"
	FOREIGN KEY ("template_id") REFERENCES "public"."pickup_window_templates"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_vendor_id_vendors_id_fk"
	FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_location_id_pickup_locations_id_fk"
	FOREIGN KEY ("location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_window_id_pickup_windows_id_fk"
	FOREIGN KEY ("pickup_window_id") REFERENCES "public"."pickup_windows"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_pickup_locations_id_fk"
	FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX "pickup_locations_vendor_idx" ON "pickup_locations" USING btree ("vendor_id");
--> statement-breakpoint

CREATE INDEX "pickup_locations_active_idx" ON "pickup_locations" USING btree ("vendor_id", "is_active");
--> statement-breakpoint

CREATE INDEX "pickup_window_templates_vendor_idx" ON "pickup_window_templates" USING btree ("vendor_id");
--> statement-breakpoint

CREATE INDEX "pickup_window_templates_active_idx" ON "pickup_window_templates" USING btree ("vendor_id", "is_active");
--> statement-breakpoint

CREATE INDEX "pickup_windows_vendor_idx" ON "pickup_windows" USING btree ("vendor_id");
--> statement-breakpoint

CREATE INDEX "pickup_windows_vendor_starts_idx" ON "pickup_windows" USING btree ("vendor_id", "starts_at");
--> statement-breakpoint

CREATE INDEX "pickup_windows_template_idx" ON "pickup_windows" USING btree ("template_id");
