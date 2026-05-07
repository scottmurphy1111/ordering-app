ALTER TABLE "vendors" ADD COLUMN "subscription_paused_at" timestamp;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "pause_until" timestamp;