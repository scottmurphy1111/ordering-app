CREATE TABLE "production_last_viewed" (
	"vendor_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"last_viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "production_last_viewed_vendor_id_user_id_pk" PRIMARY KEY("vendor_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "production_last_viewed" ADD CONSTRAINT "production_last_viewed_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_last_viewed" ADD CONSTRAINT "production_last_viewed_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;