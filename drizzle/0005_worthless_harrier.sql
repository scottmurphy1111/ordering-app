ALTER TABLE "menu_items" ADD COLUMN "is_subscription" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "billing_interval" varchar(20);