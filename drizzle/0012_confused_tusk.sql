CREATE TYPE "public"."fulfillment_model" AS ENUM('storefront', 'pickup_only', 'hybrid');--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "fulfillment_model" "fulfillment_model" NOT NULL;