ALTER TABLE "vendors" ALTER COLUMN "settings" SET DEFAULT '{"currency":"USD","taxRate":0.0825,"enableTips":false,"defaultTipPercentages":[15,18,20],"allowPickup":true,"minimumOrderAmount":0,"estimatedPrepTimeMinutes":15}'::jsonb;--> statement-breakpoint
ALTER TABLE "catalog_items" DROP COLUMN "availability_mode";--> statement-breakpoint
DROP TYPE "public"."availability_mode";