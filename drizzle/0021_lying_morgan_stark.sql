ALTER TABLE "vendors" ADD COLUMN "background_pattern_slug" varchar(32);--> statement-breakpoint
ALTER TABLE "vendors" DROP COLUMN "background_display_mode";--> statement-breakpoint
DROP TYPE "public"."background_display_mode";