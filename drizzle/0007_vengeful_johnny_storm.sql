CREATE TYPE "public"."pickup_type" AS ENUM('windowed', 'custom_date');--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'pending_approval';--> statement-breakpoint
ALTER TYPE "public"."order_status" ADD VALUE 'payment_failed';--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "pickup_type" "pickup_type" DEFAULT 'windowed' NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD COLUMN "custom_date_lead_days" integer DEFAULT 14;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_type" "pickup_type" DEFAULT 'windowed' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_setup_intent_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_customer_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "stripe_payment_method_id" varchar(255);