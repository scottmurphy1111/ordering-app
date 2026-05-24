#!/usr/bin/env bun
// Dev-only script: wipe one vendor's transactional + catalog data, then re-seed
// using the archetype system in src/lib/server/seed/.
// Preserves the vendor row itself — Stripe keys, name, slug, subscription,
// and team memberships stay intact.
// Bun loads .env automatically — no dotenv import needed.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { createInterface } from 'node:readline/promises';
import { ARCHETYPES, archetypesForFulfillmentModel } from '../src/lib/server/seed/archetypes/index';
import { reseedVendor } from '../src/lib/server/seed/seed';

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const YES = args.includes('--yes');
const vendorArg = args.find((a) => a.startsWith('--vendor='))?.split('=')[1];
const archetypeArg = args.find((a) => a.startsWith('--archetype='))?.split('=')[1];

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

// ── Vendor lookup ─────────────────────────────────────────────────────────────

let targetVendor: { id: number; name: string; slug: string; fulfillment_model: string } | null =
	null;

if (vendorArg) {
	const asNumber = Number(vendorArg);
	if (!isNaN(asNumber)) {
		const result = await db.execute(
			sql`SELECT id, name, slug, fulfillment_model FROM vendors WHERE id = ${asNumber} LIMIT 1`
		);
		targetVendor = (result.rows[0] as unknown as typeof targetVendor) ?? null;
	}
	if (!targetVendor) {
		const result = await db.execute(
			sql`SELECT id, name, slug, fulfillment_model FROM vendors WHERE slug = ${vendorArg} LIMIT 1`
		);
		targetVendor = (result.rows[0] as unknown as typeof targetVendor) ?? null;
	}
	if (!targetVendor) {
		console.error(`✗ No vendor found matching "${vendorArg}"`);
		process.exit(1);
	}
} else {
	const result = await db.execute(
		sql`SELECT id, name, slug, fulfillment_model FROM vendors ORDER BY id ASC`
	);
	const vendors = result.rows as Array<{
		id: number;
		name: string;
		slug: string;
		fulfillment_model: string;
	}>;
	if (vendors.length === 0) {
		console.error('✗ No vendors found in this database.');
		process.exit(1);
	}
	console.log('Available vendors:');
	for (const v of vendors) {
		console.log(`  ${v.id}\t${v.slug}\t[${v.fulfillment_model}]\t${v.name}`);
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

// ── Archetype selection ───────────────────────────────────────────────────────

const fulfillmentModel = targetVendor.fulfillment_model as 'storefront' | 'pickup_only' | 'hybrid';
const compatible = archetypesForFulfillmentModel(fulfillmentModel);

let archetypeKey: string;

if (archetypeArg) {
	archetypeKey = archetypeArg;
	if (!ARCHETYPES[archetypeKey]) {
		console.error(`✗ Unknown archetype "${archetypeKey}".`);
		console.error('  Available archetypes: ' + Object.keys(ARCHETYPES).join(', '));
		process.exit(1);
	}
	const archetype = ARCHETYPES[archetypeKey];
	const isCompatible = (archetype.allowedFulfillmentModels as string[]).includes(fulfillmentModel);
	if (!isCompatible) {
		console.warn(
			`⚠ Archetype "${archetypeKey}" (${archetype.fulfillmentModel}) is not in the compatible list for this vendor's fulfillment model (${fulfillmentModel}).`
		);
		if (!YES) {
			const rl = createInterface({ input: process.stdin, output: process.stdout });
			const input = (
				await rl.question('Type "yes" to proceed anyway, or anything else to abort: ')
			).trim();
			rl.close();
			if (input.toLowerCase() !== 'yes') {
				console.error('✗ Aborted.');
				process.exit(1);
			}
		}
	}
} else if (compatible.length === 0) {
	console.error(
		`✗ No archetypes are compatible with fulfillment model "${fulfillmentModel}" for vendor "${targetVendor.slug}".`
	);
	console.error(
		'  Use --archetype=<key> with --yes to force a specific archetype despite the mismatch.'
	);
	console.error('  Available archetypes: ' + Object.keys(ARCHETYPES).join(', '));
	process.exit(1);
} else if (compatible.length === 1) {
	archetypeKey = compatible[0].key;
	console.log(`Using archetype: ${compatible[0].label} (${archetypeKey})`);
	console.log('');
} else {
	console.log(`Compatible archetypes for model "${fulfillmentModel}":`);
	for (let i = 0; i < compatible.length; i++) {
		console.log(`  ${i + 1}\t${compatible[i].key}\t${compatible[i].label}`);
	}
	console.log('');
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const input = (await rl.question('Enter archetype number: ')).trim();
	rl.close();
	const idx = Number(input) - 1;
	if (isNaN(idx) || idx < 0 || idx >= compatible.length) {
		console.error('✗ Invalid selection.');
		process.exit(1);
	}
	archetypeKey = compatible[idx].key;
}

const fixture = ARCHETYPES[archetypeKey];

// ── Confirmation ──────────────────────────────────────────────────────────────

console.log('About to RESEED vendor on:');
console.log(`  Host: ${host}`);
console.log(`  Database: ${dbName}`);
console.log('');
console.log('Target vendor:');
console.log(`  ID:               ${targetVendor.id}`);
console.log(`  Slug:             ${targetVendor.slug}`);
console.log(`  Name:             ${targetVendor.name}`);
console.log(`  Fulfillment model: ${targetVendor.fulfillment_model}`);
console.log('');
console.log(`Archetype: ${fixture.label} (${archetypeKey})`);
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
console.log(
	'  - The vendor row itself (Stripe keys, name, slug, timezone, fulfillment_model, subscription)'
);
console.log("  - All other vendors' data");
console.log('  - Auth (users, sessions, accounts, verifications)');
console.log('  - vendor_users (team membership)');
console.log('  - vendor_invitations (except demo addresses above)');
console.log('');
console.log('After wipe, will seed:');
console.log(
	`  - ${fixture.categories.length} categories, ${fixture.items.length} catalog items, ${fixture.modifiers.length} modifier groups`
);
console.log(
	`  - ${fixture.locations.length} pickup location(s), ${fixture.templates.length} pickup template(s)`
);
console.log('  - Branding, settings, tagline on vendor row');
console.log(`  - ${fixture.promoCodes.length} promo codes`);
console.log(`  - ${fixture.invitations.length} pending team invitation(s)`);
console.log(`  - ${fixture.orders.length} demo orders`);
console.log('');

if (!YES) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const input = (await rl.question('Type "reseed" to confirm (or pass --yes to skip): ')).trim();
	rl.close();
	if (input !== 'reseed') {
		console.error('✗ Confirmation not received. Aborting.');
		process.exit(1);
	}
}

// ── Wipe + seed via shared functions ─────────────────────────────────────────

try {
	await reseedVendor(targetVendor.id, archetypeKey);
} catch (err) {
	console.error('✗ Reseed failed:', err);
	process.exit(1);
}

console.log('');
console.log(
	`✓ Reseeded vendor "${targetVendor.name}" (${targetVendor.slug}, id=${targetVendor.id})`
);
console.log(`  Archetype: ${fixture.label}`);
console.log(
	`  - ${fixture.categories.length} categories, ${fixture.items.length} catalog items, ${fixture.modifiers.length} modifier groups`
);
console.log(
	`  - ${fixture.locations.length} pickup location(s), ${fixture.templates.length} pickup template(s)`
);
console.log('  - Branding, settings, tagline applied to vendor row');
console.log(`  - ${fixture.promoCodes.length} promo codes`);
console.log(`  - ${fixture.invitations.length} pending team invitation(s)`);
console.log(`  - ${fixture.orders.length} demo orders`);
console.log('');
console.log('Stripe keys, name, slug, fulfillment_model, and team memberships were preserved.');
console.log('');
console.log('Suggested next steps:');
console.log('  bun run cron:materialize');
console.log('    → regenerates pickup_windows from the new template(s)');
console.log('  Visit the storefront to verify branding');

process.exit(0);
