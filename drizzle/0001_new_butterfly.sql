CREATE TYPE "public"."order_status" AS ENUM('received', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
DROP INDEX "tenants_subscription_idx";--> statement-breakpoint
DROP INDEX "tenants_created_idx";--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "role" SET DEFAULT 'owner';--> statement-breakpoint
ALTER TABLE "tenant_users" ALTER COLUMN "role" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "address" SET DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "address" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "is_approved" SET DEFAULT true;--> statement-breakpoint
ALTER TABLE "menu_item_modifiers" ALTER COLUMN "menu_item_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "menu_item_modifiers" ALTER COLUMN "modifier_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tenant_users" ADD COLUMN "assigned_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_internal" boolean DEFAULT false NOT NULL;