CREATE TYPE "public"."order_status" AS ENUM('received', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."vendor_type" AS ENUM('quick_service', 'full_service', 'cafe', 'food_truck', 'bar', 'bakery', 'other');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"is_internal" boolean DEFAULT false NOT NULL,
	"banned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"legal_name" varchar(255),
	"type" "vendor_type" DEFAULT 'quick_service',
	"address" jsonb DEFAULT '{}'::jsonb,
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"logo_url" text,
	"banner_url" text,
	"favicon_url" text,
	"background_image_url" text,
	"background_color" varchar(7) DEFAULT '#000000',
	"accent_color" varchar(7) DEFAULT '#374151',
	"foreground_color" varchar(7) DEFAULT '#ffffff',
	"settings" jsonb DEFAULT '{"currency":"USD","taxRate":0.0825,"enableTips":true,"defaultTipPercentages":[15,18,20],"allowPickup":true,"allowDelivery":false,"minimumOrderAmount":0,"estimatedPrepTimeMinutes":15,"hours":{},"specialHours":[]}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT true,
	"suspended_at" timestamp,
	"suspended_reason" text,
	"subscription_tier" varchar(50) DEFAULT 'starter',
	"subscription_status" varchar(50) DEFAULT 'active',
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_secret_key" text,
	"stripe_publishable_key" text,
	"stripe_webhook_secret" text,
	"stripe_webhook_endpoint_id" text,
	"addons" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vendor_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_users" (
	"vendor_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'owner' NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_users_vendor_id_user_id_pk" PRIMARY KEY("vendor_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "catalog_item_modifiers" (
	"catalog_item_id" integer NOT NULL,
	"modifier_id" integer NOT NULL,
	CONSTRAINT "catalog_item_modifiers_catalog_item_id_modifier_id_pk" PRIMARY KEY("catalog_item_id","modifier_id")
);
--> statement-breakpoint
CREATE TABLE "catalog_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"category_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" integer NOT NULL,
	"discounted_price" integer,
	"images" jsonb DEFAULT '[]'::jsonb,
	"video_url" text,
	"allergens" jsonb DEFAULT '[]'::jsonb,
	"nutrition" jsonb,
	"tags" text[],
	"modifiers" jsonb DEFAULT '[]'::jsonb,
	"is_subscription" boolean DEFAULT false,
	"billing_interval" varchar(20),
	"available" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"modifier_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price_adjustment" integer DEFAULT 0,
	"is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "modifiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_required" boolean DEFAULT false,
	"max_selections" integer DEFAULT 1,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"catalog_item_id" integer,
	"name" varchar(255) NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" integer NOT NULL,
	"selected_modifiers" jsonb DEFAULT '[]'::jsonb,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"customer_phone" varchar(20),
	"type" varchar(20) NOT NULL,
	"status" "order_status" DEFAULT 'received' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'pending' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"delivery_fee" integer DEFAULT 0,
	"tip" integer DEFAULT 0,
	"total" integer NOT NULL,
	"items" jsonb NOT NULL,
	"discount" integer DEFAULT 0,
	"promo_code" varchar(50),
	"delivery_address" text,
	"notes" text,
	"scheduled_for" timestamp,
	"estimated_ready_time" timestamp,
	"stripe_payment_intent_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"type" varchar(10) NOT NULL,
	"amount" integer NOT NULL,
	"min_order_amount" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"current_stamps" integer DEFAULT 0 NOT NULL,
	"total_stamps_earned" integer DEFAULT 0 NOT NULL,
	"current_points" integer DEFAULT 0 NOT NULL,
	"total_points_earned" integer DEFAULT 0 NOT NULL,
	"total_rewards_earned" integer DEFAULT 0 NOT NULL,
	"last_order_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_modifiers" ADD CONSTRAINT "catalog_item_modifiers_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_modifiers" ADD CONSTRAINT "catalog_item_modifiers_modifier_id_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_modifier_id_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vendors_active_idx" ON "vendors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "vendors_vendor_lookup_idx" ON "vendors" USING btree ("slug","is_active");--> statement-breakpoint
CREATE INDEX "catalog_categories_vendor_idx" ON "catalog_categories" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_idx" ON "catalog_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_category_idx" ON "catalog_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_name_idx" ON "catalog_items" USING btree ("vendor_id","name");--> statement-breakpoint
CREATE INDEX "orders_vendor_idx" ON "orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "promo_codes_vendor_idx" ON "promo_codes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("vendor_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_vendor_email_idx" ON "loyalty_accounts" USING btree ("vendor_id","email");--> statement-breakpoint
CREATE INDEX "loyalty_accounts_vendor_idx" ON "loyalty_accounts" USING btree ("vendor_id");