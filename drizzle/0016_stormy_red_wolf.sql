CREATE TYPE "public"."special_order_request_state" AS ENUM('pending', 'quoted', 'declined', 'accepted', 'expired');--> statement-breakpoint
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
	"declined_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "special_order_requests" ADD CONSTRAINT "special_order_requests_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_order_requests_vendor_id_idx" ON "special_order_requests" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "special_order_requests_state_idx" ON "special_order_requests" USING btree ("state");