DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "vendors_active_idx";--> statement-breakpoint
DROP INDEX "vendors_slug_idx";--> statement-breakpoint
DROP INDEX "vendors_vendor_lookup_idx";--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "catalog_categories_vendor_idx";--> statement-breakpoint
DROP INDEX "promo_codes_code_idx";--> statement-breakpoint
DROP INDEX "promo_codes_vendor_idx";--> statement-breakpoint
DROP INDEX "loyalty_accounts_vendor_email_idx";--> statement-breakpoint
DROP INDEX "loyalty_accounts_vendor_idx";--> statement-breakpoint
DROP INDEX "catalog_items_category_idx";--> statement-breakpoint
DROP INDEX "catalog_items_vendor_idx";--> statement-breakpoint
DROP INDEX "catalog_items_vendor_name_idx";--> statement-breakpoint
DROP INDEX "orders_created_idx";--> statement-breakpoint
DROP INDEX "orders_status_idx";--> statement-breakpoint
DROP INDEX "orders_vendor_idx";--> statement-breakpoint
ALTER TABLE "vendors" ALTER COLUMN "settings" SET DEFAULT '{"currency":"USD","taxRate":0.0825,"enableTips":false,"defaultTipPercentages":[15,18,20],"allowPickup":true,"allowDelivery":false,"minimumOrderAmount":0,"estimatedPrepTimeMinutes":15,"asapPickupEnabled":false,"hours":{},"specialHours":[]}'::jsonb;--> statement-breakpoint
CREATE INDEX "pickup_locations_vendor_idx" ON "pickup_locations" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_locations_active_idx" ON "pickup_locations" USING btree ("vendor_id","is_active");--> statement-breakpoint
CREATE INDEX "pickup_window_templates_vendor_idx" ON "pickup_window_templates" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_window_templates_active_idx" ON "pickup_window_templates" USING btree ("vendor_id","is_active");--> statement-breakpoint
CREATE INDEX "pickup_windows_vendor_idx" ON "pickup_windows" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "pickup_windows_vendor_starts_idx" ON "pickup_windows" USING btree ("vendor_id","starts_at");--> statement-breakpoint
CREATE INDEX "pickup_windows_template_idx" ON "pickup_windows" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "vendors_active_idx" ON "vendors" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "vendors_slug_idx" ON "vendors" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "vendors_vendor_lookup_idx" ON "vendors" USING btree ("slug","is_active");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "catalog_categories_vendor_idx" ON "catalog_categories" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "promo_codes_code_idx" ON "promo_codes" USING btree ("vendor_id","code");--> statement-breakpoint
CREATE INDEX "promo_codes_vendor_idx" ON "promo_codes" USING btree ("vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loyalty_accounts_vendor_email_idx" ON "loyalty_accounts" USING btree ("vendor_id","email");--> statement-breakpoint
CREATE INDEX "loyalty_accounts_vendor_idx" ON "loyalty_accounts" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_category_idx" ON "catalog_items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_idx" ON "catalog_items" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "catalog_items_vendor_name_idx" ON "catalog_items" USING btree ("vendor_id","name");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("vendor_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("vendor_id","status");--> statement-breakpoint
CREATE INDEX "orders_vendor_idx" ON "orders" USING btree ("vendor_id");