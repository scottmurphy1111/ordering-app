ALTER TABLE "system_events" ADD COLUMN "status" varchar(20) DEFAULT 'ok' NOT NULL;--> statement-breakpoint
CREATE INDEX "system_events_created_at_idx" ON "system_events" USING btree ("created_at");