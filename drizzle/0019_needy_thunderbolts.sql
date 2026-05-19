ALTER TABLE "vendors" ADD COLUMN "show_name" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "show_tagline" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "show_logo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "font_pair" varchar(32) DEFAULT 'fraunces-dm-sans' NOT NULL;