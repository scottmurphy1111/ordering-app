-- Idempotent repair: ensure item_status enum, catalog_items.status, and vendors.tagline exist.
-- Safe to run regardless of current database state.

-- Create item_status enum if it doesn't already exist
DO $$ BEGIN
    CREATE TYPE "public"."item_status" AS ENUM('draft', 'available', 'sold_out', 'hidden');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- Add status column to catalog_items if missing
ALTER TABLE "catalog_items" ADD COLUMN IF NOT EXISTS "status" "item_status" NOT NULL DEFAULT 'available';
--> statement-breakpoint

-- Drop available column from catalog_items if it still exists
ALTER TABLE "catalog_items" DROP COLUMN IF EXISTS "available";
--> statement-breakpoint

-- Add tagline column to vendors if missing
ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "tagline" varchar(255);
