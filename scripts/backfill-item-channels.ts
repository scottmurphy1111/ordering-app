#!/usr/bin/env bun
// One-time idempotent backfill: derive the four fulfillment-channel booleans on
// catalog_items (allow_store_hours, allow_pickup_events, allow_custom_date,
// is_unlisted) from the existing pickup_type / availability_mode enums and the
// owning vendor's fulfillment_model. Re-running recomputes from the unchanged
// old enums, so it's safe to run twice.
//
// The migration adds the columns with static defaults; this script overwrites
// each existing row with precise per-row values. Nothing in app code reads the
// new columns yet (Phase 3), so this can run any time.
//
// Flags (modeled on scripts/delete-vendor.ts):
//   --dry-run   compute and print the summary + conflict list; write nothing
//   --force     required to run against a production-looking DATABASE_URL
//   --yes       skip the interactive confirmation (prod writes only)
//
// Bun loads .env automatically — no dotenv import needed.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { createInterface } from 'node:readline/promises';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const YES = args.includes('--yes');

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

console.log(`\n  Host: ${host}`);
console.log(`  Database: ${dbName}`);
console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'WRITE'}\n`);

// ── Read every item joined to its vendor's fulfillment model ─────────────────

type ItemRow = {
	id: number;
	pickup_type: string;
	availability_mode: string;
	fulfillment_model: string;
};

const result = await db.execute(sql`
	SELECT ci.id, ci.pickup_type, ci.availability_mode, v.fulfillment_model
	FROM catalog_items ci
	JOIN vendors v ON v.id = ci.vendor_id
`);
const items = result.rows as unknown as ItemRow[];

// ── Compute the four booleans per the agreed truth table ─────────────────────

type Channels = {
	allowStoreHours: boolean;
	allowPickupEvents: boolean;
	allowCustomDate: boolean;
	isUnlisted: boolean;
};

function computeChannels(row: ItemRow): { channels: Channels; conflict: boolean } {
	const isUnlisted = row.availability_mode === 'unlisted';

	if (row.pickup_type === 'custom_date') {
		return {
			channels: {
				allowCustomDate: true,
				allowStoreHours: false,
				allowPickupEvents: false,
				isUnlisted
			},
			conflict: false
		};
	}

	// windowed
	const isHybrid = row.fulfillment_model === 'hybrid';
	let allowStoreHours: boolean;
	let allowPickupEvents: boolean;
	let conflict = false;

	switch (row.availability_mode) {
		case 'events_only':
			allowStoreHours = false;
			allowPickupEvents = true;
			break;
		case 'storefront_only':
			if (isHybrid) {
				allowStoreHours = true;
				allowPickupEvents = false;
			} else {
				// pickup_only — CONFLICT: no valid channel. Mark unsellable + log.
				allowStoreHours = false;
				allowPickupEvents = false;
				conflict = true;
			}
			break;
		default: // 'always' or 'unlisted'
			allowPickupEvents = true;
			allowStoreHours = isHybrid;
			break;
	}

	return {
		channels: { allowCustomDate: false, allowStoreHours, allowPickupEvents, isUnlisted },
		conflict
	};
}

// ── Tally + apply ────────────────────────────────────────────────────────────

const comboCounts = new Map<string, number>();
const conflicts: number[] = [];
const plan: Array<{ id: number; channels: Channels }> = [];

for (const row of items) {
	const { channels, conflict } = computeChannels(row);
	if (conflict) conflicts.push(row.id);
	const key = `store=${channels.allowStoreHours} events=${channels.allowPickupEvents} custom=${channels.allowCustomDate} unlisted=${channels.isUnlisted}`;
	comboCounts.set(key, (comboCounts.get(key) ?? 0) + 1);
	plan.push({ id: row.id, channels });
}

console.log(`  Total catalog items: ${items.length}`);
console.log('  Resulting channel combinations:');
for (const [combo, n] of [...comboCounts.entries()].sort()) {
	console.log(`    ${n.toString().padStart(5)}  ${combo}`);
}

// Prod confirmation (write mode only) — modeled on delete-vendor's --yes gate.
if (!DRY_RUN && looksProd && !YES) {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(
		`\n  Write channel values to ${items.length} items on PRODUCTION (${dbName})? Type "yes" to confirm: `
	);
	rl.close();
	if (answer.trim() !== 'yes') {
		console.error('✗ Confirmation failed — aborting');
		process.exit(1);
	}
}

let updated = 0;
if (!DRY_RUN) {
	for (const { id, channels } of plan) {
		await db.execute(sql`
			UPDATE catalog_items
			SET allow_store_hours = ${channels.allowStoreHours},
				allow_pickup_events = ${channels.allowPickupEvents},
				allow_custom_date = ${channels.allowCustomDate},
				is_unlisted = ${channels.isUnlisted}
			WHERE id = ${id}
		`);
		updated++;
	}
}

// ── Final summary ────────────────────────────────────────────────────────────

console.log('');
if (DRY_RUN) {
	console.log(`  Dry run complete — no rows written (${items.length} items would be updated).`);
} else {
	console.log(`✓ Updated ${updated} of ${items.length} items.`);
}

if (conflicts.length > 0) {
	console.log(
		`\n⚠ ${conflicts.length} item${conflicts.length === 1 ? ' is' : 's are'} storefront_only under a pickup_only vendor and ${
			conflicts.length === 1 ? 'was' : 'were'
		} set to NO channels (unsellable). Fix these manually: ids = [${conflicts.join(', ')}]`
	);
} else {
	console.log('\n  No storefront_only / pickup_only conflicts found.');
}

process.exit(0);
