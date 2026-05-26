#!/usr/bin/env bun
// Dev-only script: fully delete a vendor and all associated data.
// Cascades handle child tables (16 tables reference vendor.id with onDelete: 'cascade').
// system_events.vendor_id is set to null per its FK config (audit trail preserved).
// Bun loads .env automatically — no dotenv import needed.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const YES = args.includes('--yes');
const vendorArg = args.find((a) => a.startsWith('--vendor='))?.split('=')[1];

if (!process.env.DATABASE_URL) {
	console.error('✗ DATABASE_URL is not set');
	process.exit(1);
}

const url = new URL(process.env.DATABASE_URL);
const host = url.hostname;
const dbName = url.pathname.slice(1).split('?')[0];

const looksProd = /prod|production|live/i.test(host) || /prod|production|live/i.test(dbName);
if (looksProd && !FORCE) {
	console.error(`✗ This looks like a production URL (host: ${host}, db: ${dbName}).`);
	console.error('  Pass --force if you really mean it.');
	process.exit(1);
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

if (!vendorArg) {
	console.error('✗ Usage: bun scripts/delete-vendor.ts --vendor=<slug-or-id> [--yes] [--force]');
	process.exit(1);
}

// ── Vendor lookup — accept numeric id or slug ────────────────────────────────

let targetVendor: { id: number; name: string; slug: string } | null = null;
const asNumber = Number(vendorArg);
if (!isNaN(asNumber)) {
	const result = await db.execute(
		sql`SELECT id, name, slug FROM vendors WHERE id = ${asNumber} LIMIT 1`
	);
	targetVendor = (result.rows[0] as unknown as typeof targetVendor) ?? null;
}
if (!targetVendor) {
	const result = await db.execute(
		sql`SELECT id, name, slug FROM vendors WHERE slug = ${vendorArg} LIMIT 1`
	);
	targetVendor = (result.rows[0] as unknown as typeof targetVendor) ?? null;
}
if (!targetVendor) {
	console.error(`✗ No vendor found matching "${vendorArg}"`);
	process.exit(1);
}

// ── Count related rows for the confirmation message ──────────────────────────

const counts = await db.execute(sql`
	SELECT
		(SELECT COUNT(*) FROM orders WHERE vendor_id = ${targetVendor.id}) AS orders,
		(SELECT COUNT(*) FROM catalog_items WHERE vendor_id = ${targetVendor.id}) AS catalog_items,
		(SELECT COUNT(*) FROM catalog_categories WHERE vendor_id = ${targetVendor.id}) AS catalog_categories,
		(SELECT COUNT(*) FROM modifiers WHERE vendor_id = ${targetVendor.id}) AS modifiers,
		(SELECT COUNT(*) FROM pickup_locations WHERE vendor_id = ${targetVendor.id}) AS pickup_locations,
		(SELECT COUNT(*) FROM pickup_window_templates WHERE vendor_id = ${targetVendor.id}) AS pickup_templates,
		(SELECT COUNT(*) FROM pickup_windows WHERE vendor_id = ${targetVendor.id}) AS pickup_windows,
		(SELECT COUNT(*) FROM loyalty_accounts WHERE vendor_id = ${targetVendor.id}) AS loyalty_accounts,
		(SELECT COUNT(*) FROM promo_codes WHERE vendor_id = ${targetVendor.id}) AS promos,
		(SELECT COUNT(*) FROM special_order_requests WHERE vendor_id = ${targetVendor.id}) AS special_orders,
		(SELECT COUNT(*) FROM special_order_quotes WHERE vendor_id = ${targetVendor.id}) AS special_order_quotes,
		(SELECT COUNT(*) FROM vendor_notifications WHERE vendor_id = ${targetVendor.id}) AS notifications,
		(SELECT COUNT(*) FROM vendor_invitations WHERE vendor_id = ${targetVendor.id}) AS invitations,
		(SELECT COUNT(*) FROM vendor_users WHERE vendor_id = ${targetVendor.id}) AS team_members,
		(SELECT COUNT(*) FROM vendor_hours WHERE vendor_id = ${targetVendor.id}) AS hours_rows,
		(SELECT COUNT(*) FROM vendor_hours_exceptions WHERE vendor_id = ${targetVendor.id}) AS hours_exceptions
`);
const c = counts.rows[0] as Record<string, number>;

console.log(`\n  Host: ${host}`);
console.log(`  Database: ${dbName}`);
console.log('');
console.log(`  Vendor: ${targetVendor.name} (id=${targetVendor.id}, slug=${targetVendor.slug})`);
console.log('  Related data that will be deleted (cascade):');
console.log(`    Orders                ${c.orders}`);
console.log(`    Catalog items         ${c.catalog_items}`);
console.log(`    Catalog categories    ${c.catalog_categories}`);
console.log(`    Modifiers             ${c.modifiers}`);
console.log(`    Pickup locations      ${c.pickup_locations}`);
console.log(`    Pickup templates      ${c.pickup_templates}`);
console.log(`    Pickup windows        ${c.pickup_windows}`);
console.log(`    Loyalty accounts      ${c.loyalty_accounts}`);
console.log(`    Promo codes           ${c.promos}`);
console.log(`    Special orders        ${c.special_orders}`);
console.log(`    Special order quotes  ${c.special_order_quotes}`);
console.log(`    Notifications         ${c.notifications}`);
console.log(`    Pending invitations   ${c.invitations}`);
console.log(`    Team memberships      ${c.team_members}`);
console.log(`    Hours                 ${c.hours_rows}`);
console.log(`    Hours exceptions      ${c.hours_exceptions}`);
console.log(
	`\n  System event rows referencing this vendor will be preserved (vendor_id set to NULL).`
);
console.log(`  Cascade order is handled by the schema's FK definitions.`);

if (!YES) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(
		`\n  Type the vendor slug "${targetVendor.slug}" to confirm deletion: `
	);
	rl.close();
	if (answer.trim() !== targetVendor.slug) {
		console.error('✗ Confirmation failed — aborting');
		process.exit(1);
	}
}

// ── The actual delete — cascades clean up everything except system_events ────

await db.execute(sql`DELETE FROM vendors WHERE id = ${targetVendor.id}`);

console.log(
	`\n✓ Deleted vendor "${targetVendor.name}" (id=${targetVendor.id}) and all related data.`
);
process.exit(0);
