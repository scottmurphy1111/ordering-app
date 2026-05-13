CREATE TYPE "public"."availability_mode" AS ENUM('always', 'storefront_only', 'events_only', 'special_order');--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "availability_mode" "availability_mode" DEFAULT 'always' NOT NULL;
UPDATE "catalog_items" SET "availability_mode" = 'special_order' WHERE "pickup_type" = 'custom_date';