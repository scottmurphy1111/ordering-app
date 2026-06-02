CREATE TYPE "public"."special_order_payment_status" AS ENUM('scheduled', 'paid', 'overdue', 'void');--> statement-breakpoint
ALTER TYPE "public"."payment_status" ADD VALUE 'deposit_paid' BEFORE 'paid';--> statement-breakpoint
CREATE TABLE "special_order_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer,
	"request_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"label" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"due_at" timestamp with time zone,
	"status" "special_order_payment_status" DEFAULT 'scheduled' NOT NULL,
	"pay_token" varchar(64) NOT NULL,
	"stripe_payment_intent_id" varchar(255),
	"paid_at" timestamp with time zone,
	"last_reminder_at" timestamp with time zone,
	"reminder_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "special_order_payments_pay_token_unique" UNIQUE("pay_token")
);
--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD COLUMN "deposit_cents" integer;--> statement-breakpoint
ALTER TABLE "special_order_quotes" ADD COLUMN "balance_due_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "special_order_payments" ADD CONSTRAINT "special_order_payments_request_id_special_order_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."special_order_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_payments" ADD CONSTRAINT "special_order_payments_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_order_payments_order_id_idx" ON "special_order_payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "special_order_payments_request_id_idx" ON "special_order_payments" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "special_order_payments_vendor_id_idx" ON "special_order_payments" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "special_order_payments_pay_token_idx" ON "special_order_payments" USING btree ("pay_token");