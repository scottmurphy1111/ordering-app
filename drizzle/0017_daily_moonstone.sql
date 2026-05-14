CREATE TYPE "public"."special_order_declined_by" AS ENUM('vendor', 'customer');--> statement-breakpoint
CREATE TABLE "special_order_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"message" text,
	"accept_token" varchar(64) NOT NULL,
	"expires_at" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"sent_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "special_order_quotes_accept_token_unique" UNIQUE("accept_token")
);
--> statement-breakpoint
ALTER TABLE "special_order_requests" ADD COLUMN "declined_by" "special_order_declined_by";--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD CONSTRAINT "special_order_quotes_request_id_special_order_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."special_order_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD CONSTRAINT "special_order_quotes_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_order_quotes_request_id_idx" ON "special_order_quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "special_order_quotes_vendor_id_idx" ON "special_order_quotes" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "special_order_quotes_accept_token_idx" ON "special_order_quotes" USING btree ("accept_token");