CREATE TYPE "public"."item_status" AS ENUM('draft', 'available', 'sold_out', 'hidden');--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "status" "item_status" NOT NULL DEFAULT 'available';--> statement-breakpoint
UPDATE "catalog_items" SET "status" = 'hidden' WHERE "available" = false;--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN "available";--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "tagline" varchar(255);
