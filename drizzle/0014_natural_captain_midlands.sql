CREATE TYPE "public"."pickup_mode" AS ENUM('pickup_event', 'storefront_hours', 'custom_date');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_mode" "pickup_mode" DEFAULT 'pickup_event' NOT NULL;--> statement-breakpoint
UPDATE "orders" SET "pickup_mode" = 'custom_date' WHERE "pickup_type" = 'custom_date';