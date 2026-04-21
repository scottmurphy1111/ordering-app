CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
ALTER TABLE "orders" ADD COLUMN "discount" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "promo_code" varchar(50);--> statement-breakpoint
ALTER TABLE "promo_codes" ADD CONSTRAINT "promo_codes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "promo_codes_tenant_idx" ON "promo_codes" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("tenant_id","code");