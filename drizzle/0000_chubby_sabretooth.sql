CREATE TYPE "public"."availability_mode" AS ENUM('always', 'storefront_only', 'events_only', 'special_order');--> statement-breakpoint
CREATE TYPE "public"."special_order_declined_by" AS ENUM('vendor', 'customer');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('received', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled', 'scheduled', 'pending_approval', 'payment_failed');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded', 'void');--> statement-breakpoint
CREATE TYPE "public"."pickup_mode" AS ENUM('pickup_event', 'storefront_hours', 'custom_date');--> statement-breakpoint
CREATE TYPE "public"."pickup_type" AS ENUM('windowed', 'custom_date');--> statement-breakpoint
CREATE TYPE "public"."special_order_request_state" AS ENUM('pending', 'quoted', 'declined', 'accepted', 'expired');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_model" AS ENUM('storefront', 'pickup_only', 'hybrid');--> statement-breakpoint
CREATE TYPE "public"."header_mode" AS ENUM('logo', 'name');--> statement-breakpoint
CREATE TYPE "public"."hero_display_mode" AS ENUM('none', 'headline', 'headline_tagline');--> statement-breakpoint
CREATE TYPE "public"."vendor_type" AS ENUM('bakery', 'farm', 'butcher', 'florist', 'brewery', 'coffee_shop', 'food_truck', 'specialty_maker', 'market_vendor', 'other');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('draft', 'available', 'sold_out', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."notification_severity" AS ENUM('info', 'warning', 'critical');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
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
	"banned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"legal_name" varchar(255),
	"type" "vendor_type" DEFAULT 'bakery',
	"fulfillment_model" "fulfillment_model" NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"tagline" varchar(255),
	"logo_url" text,
	"hero_image_url" text,
	"favicon_url" text,
	"background_color" varchar(7) DEFAULT '#000000',
	"accent_color" varchar(7) DEFAULT '#374151',
	"foreground_color" varchar(7) DEFAULT '#ffffff',
	"header_mode" "header_mode" DEFAULT 'logo' NOT NULL,
	"hero_display_mode" "hero_display_mode" DEFAULT 'headline_tagline' NOT NULL,
	"hero_headline" varchar(80),
	"accepts_requests" boolean DEFAULT true NOT NULL,
	"font_pair" varchar(32) DEFAULT 'fraunces-dm-sans' NOT NULL,
	"settings" jsonb DEFAULT '{"currency":"USD","taxRate":0.0825,"enableTips":false,"defaultTipPercentages":[15,18,20],"allowPickup":true,"minimumOrderAmount":0,"estimatedPrepTimeMinutes":15,"asapPickupEnabled":false}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"storefront_enabled" boolean DEFAULT true NOT NULL,
	"is_approved" boolean DEFAULT true,
	"suspended_at" timestamp with time zone,
	"suspended_reason" text,
	"subscription_tier" varchar(50) DEFAULT 'starter',
	"subscription_status" varchar(50) DEFAULT 'active',
	"subscription_ends_at" timestamp with time zone,
	"subscription_refunded_at" timestamp with time zone,
	"subscription_paused_at" timestamp with time zone,
	"pause_until" timestamp with time zone,
	"stripe_customer_id" varchar(255),
	"stripe_subscription_id" varchar(255),
	"stripe_secret_key" text,
	"stripe_publishable_key" text,
	"stripe_webhook_secret" text,
	"stripe_webhook_endpoint_id" text,
	"addons" jsonb DEFAULT '[]'::jsonb,
	"notification_prefs" jsonb DEFAULT '{"emailOptOuts":[],"marketingOptIn":false}'::jsonb,
	"last_order_number" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "vendors_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "vendor_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'staff' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_users" (
	"vendor_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"role" varchar(50) DEFAULT 'owner' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendor_users_vendor_id_user_id_pk" PRIMARY KEY("vendor_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "vendor_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"open_time" time NOT NULL,
	"close_time" time NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_hours_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"date" date NOT NULL,
	"is_closed" boolean DEFAULT false NOT NULL,
	"open_time" time,
	"close_time" time,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
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
	"fulfillment_note" text,
	"pickup_type" "pickup_type" DEFAULT 'windowed' NOT NULL,
	"custom_date_lead_days" integer DEFAULT 14,
	"availability_mode" "availability_mode" DEFAULT 'always' NOT NULL,
	"status" "item_status" DEFAULT 'available' NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"modifier_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price_adjustment" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0
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
	"pickup_type" "pickup_type" DEFAULT 'windowed' NOT NULL,
	"pickup_mode" "pickup_mode" DEFAULT 'pickup_event' NOT NULL,
	"subtotal" integer NOT NULL,
	"tax" integer NOT NULL,
	"tip" integer DEFAULT 0,
	"total" integer NOT NULL,
	"items" jsonb NOT NULL,
	"discount" integer DEFAULT 0,
	"promo_code" varchar(50),
	"notes" text,
	"scheduled_for" timestamp with time zone,
	"proposed_date" timestamp with time zone,
	"proposed_reason" text,
	"proposed_at" timestamp with time zone,
	"estimated_ready_time" timestamp with time zone,
	"pickup_window_id" integer,
	"pickup_location_id" integer,
	"pickup_window_snapshot" jsonb,
	"special_order_request_id" integer,
	"stripe_payment_intent_id" varchar(255),
	"stripe_setup_intent_id" varchar(255),
	"stripe_customer_id" varchar(255),
	"stripe_payment_method_id" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" jsonb,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_window_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"location_id" integer,
	"name" text NOT NULL,
	"recurrence" text NOT NULL,
	"window_start" time NOT NULL,
	"window_end" time NOT NULL,
	"cutoff_hours" integer DEFAULT 48 NOT NULL,
	"max_orders" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"recurrence_start_date" timestamp with time zone,
	"recurrence_end_date" timestamp with time zone,
	"exdates" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_windows" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer,
	"vendor_id" integer NOT NULL,
	"location_id" integer,
	"name" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"cutoff_at" timestamp with time zone NOT NULL,
	"max_orders" integer,
	"is_cancelled" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pickup_windows_template_starts_unique" UNIQUE("template_id","starts_at")
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
	"expires_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"status" varchar(20) DEFAULT 'ok' NOT NULL,
	"vendor_id" integer,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_order_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"message" text,
	"accept_token" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"sent_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "special_order_quotes_accept_token_unique" UNIQUE("accept_token")
);
--> statement-breakpoint
CREATE TABLE "special_order_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"state" "special_order_request_state" DEFAULT 'pending' NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text,
	"description" text NOT NULL,
	"target_date" text,
	"photo_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"declined_reason" text,
	"declined_by" "special_order_declined_by",
	"declined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"category" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"severity" "notification_severity" DEFAULT 'info' NOT NULL,
	"action_url" text,
	"action_label" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_invitations" ADD CONSTRAINT "vendor_invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_hours" ADD CONSTRAINT "vendor_hours_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_hours_exceptions" ADD CONSTRAINT "vendor_hours_exceptions_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_modifiers" ADD CONSTRAINT "catalog_item_modifiers_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_item_modifiers" ADD CONSTRAINT "catalog_item_modifiers_modifier_id_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_items" ADD CONSTRAINT "catalog_items_category_id_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."catalog_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_modifier_id_modifiers_id_fk" FOREIGN KEY ("modifier_id") REFERENCES "public"."modifiers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modifiers" ADD CONSTRAINT "modifiers_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_catalog_item_id_catalog_items_id_fk" FOREIGN KEY ("catalog_item_id") REFERENCES "public"."catalog_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_window_id_pickup_windows_id_fk" FOREIGN KEY ("pickup_window_id") REFERENCES "public"."pickup_windows"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_location_id_pickup_locations_id_fk" FOREIGN KEY ("pickup_location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_special_order_request_id_special_order_requests_id_fk" FOREIGN KEY ("special_order_request_id") REFERENCES "public"."special_order_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_window_templates" ADD CONSTRAINT "pickup_window_templates_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_window_templates" ADD CONSTRAINT "pickup_window_templates_location_id_pickup_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_template_id_pickup_window_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."pickup_window_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_windows" ADD CONSTRAINT "pickup_windows_location_id_pickup_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."pickup_locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_events" ADD CONSTRAINT "system_events_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD CONSTRAINT "special_order_quotes_request_id_special_order_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."special_order_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD CONSTRAINT "special_order_quotes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_requests" ADD CONSTRAINT "special_order_requests_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_notifications" ADD CONSTRAINT "vendor_notifications_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vendors_active_idx" ON "vendors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "vendors_vendor_lookup_idx" ON "vendors" USING btree ("slug","is_active");--> statement-breakpoint
CREATE INDEX "vendor_hours_vendor_idx" ON "vendor_hours" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_hours_exceptions_vendor_date_unique" ON "vendor_hours_exceptions" USING btree ("vendor_id","date");--> statement-breakpoint
CREATE INDEX "vendor_hours_exceptions_vendor_idx" ON "vendor_hours_exceptions" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_categories_vendor_idx" ON "catalog_categories" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_idx" ON "catalog_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_category_idx" ON "catalog_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_name_idx" ON "catalog_items" USING btree ("vendor_id","name");--> statement-breakpoint
CREATE INDEX "orders_vendor_idx" ON "orders" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_vendor_id_order_number_unique" ON "orders" USING btree ("vendor_id","order_number");--> statement-breakpoint
CREATE INDEX "orders_special_order_request_idx" ON "orders" USING btree ("special_order_request_id");--> statement-breakpoint
CREATE INDEX "pickup_locations_vendor_idx" ON "pickup_locations" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_locations_active_idx" ON "pickup_locations" USING btree ("vendor_id","is_active");--> statement-breakpoint
CREATE INDEX "pickup_window_templates_vendor_idx" ON "pickup_window_templates" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_window_templates_active_idx" ON "pickup_window_templates" USING btree ("vendor_id","is_active");--> statement-breakpoint
CREATE INDEX "pickup_windows_vendor_idx" ON "pickup_windows" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_windows_vendor_starts_idx" ON "pickup_windows" USING btree ("vendor_id","starts_at");--> statement-breakpoint
CREATE INDEX "pickup_windows_template_idx" ON "pickup_windows" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "promo_codes_vendor_idx" ON "promo_codes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("vendor_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_vendor_email_idx" ON "loyalty_accounts" USING btree ("vendor_id","email");--> statement-breakpoint
CREATE INDEX "loyalty_accounts_vendor_idx" ON "loyalty_accounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "system_events_created_at_idx" ON "system_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "special_order_quotes_request_id_idx" ON "special_order_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "special_order_quotes_vendor_id_idx" ON "special_order_quotes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "special_order_quotes_accept_token_idx" ON "special_order_quotes" USING btree ("accept_token");--> statement-breakpoint
CREATE INDEX "special_order_requests_vendor_id_idx" ON "special_order_requests" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "special_order_requests_state_idx" ON "special_order_requests" USING btree ("state");--> statement-breakpoint
CREATE INDEX "vendor_notifications_vendor_idx" ON "vendor_notifications" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "vendor_notifications_unread_idx" ON "vendor_notifications" USING btree ("vendor_id","read_at");