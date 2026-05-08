ALTER TABLE "orders" DROP CONSTRAINT "orders_order_number_unique";--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "last_order_number" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_vendor_id_order_number_unique" ON "orders" USING btree ("vendor_id","order_number");--> statement-breakpoint
-- Backfill: assign sequential per-vendor order numbers based on created_at ASC.
WITH numbered AS (
	SELECT
		id,
		'#' || ROW_NUMBER() OVER (PARTITION BY vendor_id ORDER BY created_at ASC)::text AS new_number
	FROM "orders"
)
UPDATE "orders" o
SET order_number = n.new_number
FROM numbered n
WHERE o.id = n.id;
--> statement-breakpoint
-- Backfill: set vendors.last_order_number to the count of orders per vendor.
UPDATE "vendors" v
SET last_order_number = COALESCE(
	(SELECT COUNT(*) FROM "orders" o WHERE o.vendor_id = v.id),
	0
);