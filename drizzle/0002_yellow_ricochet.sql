CREATE TABLE "special_order_reminders" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"kind" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"sent_to" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "balance_reminders_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "special_order_payments" ADD COLUMN "reminders_enabled" boolean;--> statement-breakpoint
ALTER TABLE "special_order_reminders" ADD CONSTRAINT "special_order_reminders_payment_id_special_order_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."special_order_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "special_order_reminders" ADD CONSTRAINT "special_order_reminders_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_order_reminders_payment_id_idx" ON "special_order_reminders" USING btree ("payment_id");