-- Replace vendor_type enum with maker/baker/grower-appropriate values.
-- Dev-only: existing rows mapped to nearest equivalent before enum swap.

-- Step 1: Convert column to text to remove the enum constraint
ALTER TABLE "vendors" ALTER COLUMN "type" TYPE text;
--> statement-breakpoint

-- Step 2: Map old restaurant-coded values to new equivalents
UPDATE "vendors" SET "type" = 'coffee_shop' WHERE "type" = 'cafe';
UPDATE "vendors" SET "type" = 'other' WHERE "type" IN ('quick_service', 'full_service', 'bar');
-- bakery, food_truck, other are already valid new values
--> statement-breakpoint

-- Step 3: Drop old enum
DROP TYPE IF EXISTS "public"."vendor_type";
--> statement-breakpoint

-- Step 4: Create new enum
CREATE TYPE "public"."vendor_type" AS ENUM('bakery', 'farm', 'butcher', 'florist', 'brewery', 'coffee_shop', 'food_truck', 'specialty_maker', 'market_vendor', 'other');
--> statement-breakpoint

-- Step 5: Re-apply enum type to column
ALTER TABLE "vendors" ALTER COLUMN "type" TYPE "public"."vendor_type" USING "type"::"public"."vendor_type";
--> statement-breakpoint

-- Step 6: Set new default
ALTER TABLE "vendors" ALTER COLUMN "type" SET DEFAULT 'bakery';
