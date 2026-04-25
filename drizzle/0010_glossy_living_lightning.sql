CREATE TABLE "loyalty_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
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
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_tenant_email_idx" ON "loyalty_accounts" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "loyalty_accounts_tenant_idx" ON "loyalty_accounts" USING btree ("tenant_id");