#!/usr/bin/env bun
// Dev-only script: wipe one vendor's transactional + catalog data, then re-seed
// with demo categories, items, modifiers, a pickup location + template, branding,
// settings, promo codes, a team invitation, and 6 demo orders.
// Preserves the vendor row itself — Stripe keys, name, slug, subscription,
// and team memberships stay intact.
// Bun loads .env automatically — no dotenv import needed.
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { eq, sql } from 'drizzle-orm';
import { createInterface } from 'node:readline/promises';
import {
	vendor,
	vendorInvitations,
	catalogCategories,
	catalogItems,
	modifiers,
	modifierOptions,
	catalogItemModifiers,
	orders,
	orderItems,
	pickupLocations,
	pickupWindowTemplates,
	promoCodes
} from '../src/lib/server/db/schema';
import {
	demoCategories,
	demoItems,
	demoTemplate,
	demoOrders,
	demoOrderCounter,
	demoModifiers,
	demoPickupLocation,
	demoBranding,
	demoSettings,
	demoPromoCodes,
	demoInvitations
} from '../src/lib/server/seed-data';

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

// Vendor lookup
let targetVendor: { id: number; name: string; slug: string } | null = null;

if (vendorArg) {
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
} else {
	const result = await db.execute(sql`SELECT id, name, slug FROM vendors ORDER BY id ASC`);
	const vendors = result.rows as Array<{ id: number; name: string; slug: string }>;
	if (vendors.length === 0) {
		console.error('✗ No vendors found in this database.');
		process.exit(1);
	}
	console.log('Available vendors:');
	for (const v of vendors) {
		console.log(`  ${v.id}\t${v.slug}\t${v.name}`);
	}
	console.log('');
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const input = (await rl.question('Enter vendor id: ')).trim();
	rl.close();
	const id = Number(input);
	if (isNaN(id)) {
		console.error('✗ Invalid id.');
		process.exit(1);
	}
	targetVendor = vendors.find((v) => v.id === id) ?? null;
	if (!targetVendor) {
		console.error(`✗ No vendor with id ${id}.`);
		process.exit(1);
	}
}

console.log('About to RESEED vendor on:');
console.log(`  Host: ${host}`);
console.log(`  Database: ${dbName}`);
console.log('');
console.log('Target vendor:');
console.log(`  ID:   ${targetVendor.id}`);
console.log(`  Slug: ${targetVendor.slug}`);
console.log(`  Name: ${targetVendor.name}`);
console.log('');
console.log("This will DELETE all of this vendor's:");
console.log('  - orders (and order_items)');
console.log('  - catalog_categories, catalog_items');
console.log('  - modifiers, modifier_options, catalog_item_modifiers');
console.log('  - pickup_locations, pickup_window_templates, pickup_windows');
console.log("  - loyalty_accounts (this vendor's customer loyalty records)");
console.log('  - promo_codes');
console.log('  - system_events scoped to this vendor');
console.log('  - demo team invitations (by email address) — other invitations preserved');
console.log('');
console.log('This will PRESERVE:');
console.log('  - The vendor row itself (Stripe keys, name, slug, timezone, subscription)');
console.log("  - All other vendors' data");
console.log('  - Auth (users, sessions, accounts, verifications)');
console.log('  - vendor_users (team membership)');
console.log("  - vendor_invitations (except demo addresses above)");
console.log('');
console.log('This will OVERWRITE on the vendor row:');
console.log('  - Branding (logo, banner, favicon, background) + colors + tagline');
console.log('  - Settings (tax rate, hours, tips, loyalty, etc.)');
console.log('');
console.log('After wipe, will seed:');
console.log(`  - ${demoCategories.length} categories, ${demoItems.length} catalog items`);
console.log(`  - ${demoModifiers.length} modifier groups (10 options total)`);
console.log('  - 1 pickup location, 1 daily pickup template');
console.log('  - Branding, settings, tagline on vendor row');
console.log(`  - ${demoPromoCodes.length} promo codes`);
console.log(`  - ${demoInvitations.length} pending team invitation`);
console.log(`  - ${demoOrders.length} demo orders`);
console.log('');

if (!YES) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const input = (
		await rl.question('Type "reseed" to confirm (or pass --yes to skip): ')
	).trim();
	rl.close();
	if (input !== 'reseed') {
		console.error('✗ Confirmation not received. Aborting.');
		process.exit(1);
	}
}

const vid = targetVendor.id;

try {
	// Orders first — order_items cascade via FK (onDelete: 'cascade').
	await db.execute(sql`DELETE FROM orders WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: orders (order_items cascade)');

	// Pickup instances before their parent templates; templates before locations.
	await db.execute(sql`DELETE FROM pickup_windows WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: pickup_windows');

	await db.execute(sql`DELETE FROM pickup_window_templates WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: pickup_window_templates');

	await db.execute(sql`DELETE FROM pickup_locations WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: pickup_locations');

	// catalog_items before catalog_categories — items.categoryId uses onDelete: 'set null'.
	// catalog_item_modifiers cascade via catalog_items FK.
	await db.execute(sql`DELETE FROM catalog_items WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: catalog_items (catalog_item_modifiers cascade)');

	await db.execute(sql`DELETE FROM catalog_categories WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: catalog_categories');

	// modifier_options cascade via modifiers FK (onDelete: 'cascade').
	await db.execute(sql`DELETE FROM modifiers WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: modifiers (modifier_options cascade)');

	await db.execute(sql`DELETE FROM loyalty_accounts WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: loyalty_accounts');

	await db.execute(sql`DELETE FROM promo_codes WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: promo_codes');

	await db.execute(sql`DELETE FROM system_events WHERE vendor_id = ${vid}`);
	console.log('✓ Deleted: system_events');

	// Remove demo invitations by address to prevent duplicates on re-reseed.
	// Other invitations (real vendor team) are preserved.
	for (const inv of demoInvitations) {
		await db.execute(
			sql`DELETE FROM vendor_invitations WHERE vendor_id = ${vid} AND email = ${inv.email}`
		);
	}
	console.log('✓ Cleared: demo vendor_invitations (other invitations preserved)');

	await db.execute(sql`UPDATE vendors SET last_order_number = 0 WHERE id = ${vid}`);
	console.log('✓ Reset: last_order_number → 0');
} catch (err) {
	console.error('✗ Wipe failed:', err);
	process.exit(1);
}

// ── Inline seed ──────────────────────────────────────────────────────────────

try {
	// Categories
	const insertedCategories = await db
		.insert(catalogCategories)
		.values(demoCategories.map(({ name, sortOrder }) => ({ vendorId: vid, name, sortOrder })))
		.returning({ id: catalogCategories.id, name: catalogCategories.name });

	const categoryIdByKey = Object.fromEntries(
		demoCategories.map((dc, i) => [dc.key, insertedCategories[i].id])
	);
	console.log(`✓ Seeded: ${insertedCategories.length} catalog categories`);

	// Items
	const seededItems = await db
		.insert(catalogItems)
		.values(
			demoItems.map((item) => ({
				vendorId: vid,
				categoryId: categoryIdByKey[item.categoryKey],
				name: item.name,
				description: item.description,
				price: item.price,
				sortOrder: item.sortOrder,
				...(item.pickupType ? { pickupType: item.pickupType } : {}),
				...(item.customDateLeadDays !== undefined
					? { customDateLeadDays: item.customDateLeadDays }
					: {})
			}))
		)
		.returning({ id: catalogItems.id, name: catalogItems.name });

	const itemIdByName = Object.fromEntries(seededItems.map((i) => [i.name, i.id]));
	console.log(`✓ Seeded: ${seededItems.length} catalog items`);

	// Modifiers
	const insertedModifiers = await db
		.insert(modifiers)
		.values(
			demoModifiers.map((m) => ({
				vendorId: vid,
				name: m.name,
				isRequired: m.isRequired,
				maxSelections: m.maxSelections,
				sortOrder: m.sortOrder
			}))
		)
		.returning({ id: modifiers.id, name: modifiers.name });

	const modifierIdByKey: Record<string, number> = {};
	for (const m of demoModifiers) {
		const row = insertedModifiers.find((r) => r.name === m.name);
		if (row) modifierIdByKey[m.key] = row.id;
	}

	for (const m of demoModifiers) {
		const groupId = modifierIdByKey[m.key];
		if (!groupId) continue;
		await db.insert(modifierOptions).values(
			m.options.map((opt) => ({
				modifierId: groupId,
				name: opt.name,
				priceAdjustment: opt.priceAdjustment,
				isDefault: opt.isDefault,
				sortOrder: opt.sortOrder
			}))
		);
	}

	const junctions: Array<{ catalogItemId: number; modifierId: number }> = [];
	for (const item of demoItems) {
		if (!item.modifierKeys?.length) continue;
		const itemId = itemIdByName[item.name];
		if (!itemId) continue;
		for (const key of item.modifierKeys) {
			const modId = modifierIdByKey[key];
			if (modId) junctions.push({ catalogItemId: itemId, modifierId: modId });
		}
	}
	if (junctions.length > 0) {
		await db.insert(catalogItemModifiers).values(junctions);
	}
	console.log(`✓ Seeded: ${demoModifiers.length} modifier groups`);

	// Pickup location
	await db.insert(pickupLocations).values({
		vendorId: vid,
		name: demoPickupLocation.name,
		address: demoPickupLocation.address,
		notes: demoPickupLocation.notes,
		sortOrder: demoPickupLocation.sortOrder,
		isActive: demoPickupLocation.isActive
	});
	console.log('✓ Seeded: 1 pickup location');

	// Pickup template
	await db.insert(pickupWindowTemplates).values({ vendorId: vid, ...demoTemplate });
	console.log('✓ Seeded: 1 pickup window template');

	// Orders + order_items
	for (const order of demoOrders) {
		const { items: lineItems, ...orderData } = order;
		const [newOrder] = await db
			.insert(orders)
			.values({ ...orderData, vendorId: vid, items: lineItems })
			.returning({ id: orders.id });

		await db.insert(orderItems).values(
			lineItems.map((li) => ({
				orderId: newOrder.id,
				catalogItemId: itemIdByName[li.name] ?? null,
				name: li.name,
				quantity: li.quantity,
				unitPrice:
					li.basePrice +
					li.selectedModifiers.reduce((acc, m) => acc + m.priceAdjustment, 0),
				selectedModifiers: li.selectedModifiers
			}))
		);
	}
	console.log(`✓ Seeded: ${demoOrders.length} demo orders`);

	// Promo codes
	await db.insert(promoCodes).values(
		demoPromoCodes.map((p) => ({
			vendorId: vid,
			code: p.code,
			description: p.description,
			type: p.type,
			amount: p.amount,
			minOrderAmount: p.minOrderAmount,
			maxUses: p.maxUses,
			expiresAt: p.expiresAt,
			isActive: p.isActive
		}))
	);
	console.log(`✓ Seeded: ${demoPromoCodes.length} promo codes`);

	// Vendor row: branding + settings + counter
	await db
		.update(vendor)
		.set({
			tagline: demoBranding.tagline,
			logoUrl: demoBranding.logoUrl,
			bannerUrl: demoBranding.bannerUrl,
			faviconUrl: demoBranding.faviconUrl,
			backgroundImageUrl: demoBranding.backgroundImageUrl,
			backgroundColor: demoBranding.backgroundColor,
			accentColor: demoBranding.accentColor,
			foregroundColor: demoBranding.foregroundColor,
			settings: demoSettings,
			lastOrderNumber: demoOrderCounter,
			updatedAt: new Date()
		})
		.where(eq(vendor.id, vid));
	console.log('✓ Updated: vendor branding, settings, tagline, last_order_number');

	// Team invitation — owner lookup via raw SQL (no schema registry on this client)
	const ownerResult = await db.execute(
		sql`SELECT user_id FROM vendor_users WHERE vendor_id = ${vid} AND role = 'owner' LIMIT 1`
	);
	const ownerId = (ownerResult.rows[0] as { user_id: string } | undefined)?.user_id ?? null;

	if (ownerId) {
		for (const inv of demoInvitations) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + inv.expiresInDays);
			await db.insert(vendorInvitations).values({
				id: crypto.randomUUID(),
				vendorId: vid,
				email: inv.email,
				role: inv.role,
				invitedByUserId: ownerId,
				expiresAt
			});
		}
		console.log(`✓ Seeded: ${demoInvitations.length} pending team invitation`);
	} else {
		console.log('⚠ Skipped: team invitation (no owner found for this vendor)');
	}
} catch (err) {
	console.error('✗ Seed failed:', err);
	process.exit(1);
}

console.log('');
console.log(`✓ Wiped vendor ${targetVendor.slug} (id=${targetVendor.id}) data`);
console.log('✓ Seeded demo data:');
console.log(`  - ${demoCategories.length} categories, ${demoItems.length} catalog items, ${demoModifiers.length} modifier groups (10 options total)`);
console.log('  - 1 pickup location, 1 daily pickup template');
console.log('  - Branding (logo, banner, favicon, background) + colors + settings + tagline');
console.log(`  - ${demoPromoCodes.length} promo codes (WELCOME10, BREAD5)`);
console.log(`  - ${demoInvitations.length} pending team invitation`);
console.log(`  - ${demoOrders.length} demo orders (2 windowed paid, 1 modifier-rich, 1 promo-applied, 1 pending_approval, 1 payment_failed)`);
console.log('');
console.log(`Vendor "${targetVendor.name}" is now in a fresh demo state.`);
console.log('Stripe keys, name, slug, and team memberships were preserved.');
console.log('');
console.log('Suggested next steps:');
console.log('  curl -H "Authorization: Bearer $CRON_SECRET" $ORIGIN/api/cron/materialize');
console.log('    → regenerates pickup_windows from the new template');
console.log('  Visit the storefront to verify branding');

process.exit(0);
