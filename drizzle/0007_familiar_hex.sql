ALTER TABLE "catalog_items" ADD COLUMN "allow_store_hours" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "allow_pickup_events" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "allow_custom_date" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "is_unlisted" boolean DEFAULT false NOT NULL;