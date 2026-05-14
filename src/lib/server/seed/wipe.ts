// Wipes all vendor-scoped data for a given vendor.
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import { DEMO_INVITATION_EMAILS } from './demo-emails';

// FK-safe deletion order:
//   1. orders          (order_items cascade via FK)
//   2. pickup_windows  (before templates)
//   3. pickup_window_templates
//   4. pickup_locations
//   5. catalog_items   (catalog_item_modifiers cascade)
//   6. catalog_categories
//   7. modifiers       (modifier_options cascade)
//   8. loyalty_accounts
//   9. vendor_hours_exceptions
//  10. vendor_hours
//  11. promo_codes
//  12. system_events
//  13. special_order_quotes  (child of special_order_requests)
//  14. special_order_requests
//  15. demo vendor_invitations (by address — real team invitations preserved)
//  16. reset last_order_number
export async function wipeVendorData(vendorId: number): Promise<void> {
	await db.execute(sql`DELETE FROM orders WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM pickup_windows WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM pickup_window_templates WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM pickup_locations WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM catalog_items WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM catalog_categories WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM modifiers WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM loyalty_accounts WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM vendor_hours_exceptions WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM vendor_hours WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM promo_codes WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM system_events WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM special_order_quotes WHERE vendor_id = ${vendorId}`);
	await db.execute(sql`DELETE FROM special_order_requests WHERE vendor_id = ${vendorId}`);

	for (const email of DEMO_INVITATION_EMAILS) {
		await db.execute(
			sql`DELETE FROM vendor_invitations WHERE vendor_id = ${vendorId} AND email = ${email}`
		);
	}

	await db.execute(sql`UPDATE vendors SET last_order_number = 0 WHERE id = ${vendorId}`);
}
