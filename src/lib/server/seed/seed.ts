// Seed and reseed functions for archetype-based demo data.
// Uses process.env.DATABASE_URL directly so this file is importable from both
// SvelteKit server code and Bun CLI scripts (which can't use $env/dynamic/private).
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import {
	catalogCategories,
	catalogItems,
	modifiers,
	modifierOptions,
	catalogItemModifiers
} from '../db/catalog';
import { orders, orderItems } from '../db/orders';
import { pickupLocations, pickupWindowTemplates } from '../db/pickup';
import { promoCodes } from '../db/promos';
import { vendor, vendorInvitations } from '../db/vendor';
import { ARCHETYPES } from './archetypes/index';
import type { ArchetypeFixture } from './types';
import { wipeVendorData } from './wipe';

function createDb() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL not set');
	return drizzle(neon(url));
}

/** Seed a brand-new vendor from an archetype (no wipe). */
export async function seedVendorWithArchetype(
	vendorId: number,
	archetypeKey: string
): Promise<void> {
	const fixture = ARCHETYPES[archetypeKey];
	if (!fixture) throw new Error(`Unknown archetype: "${archetypeKey}"`);
	await _seed(vendorId, fixture);
}

/** Wipe all vendor data then re-seed from an archetype. */
export async function reseedVendor(vendorId: number, archetypeKey: string): Promise<void> {
	const fixture = ARCHETYPES[archetypeKey];
	if (!fixture) throw new Error(`Unknown archetype: "${archetypeKey}"`);
	await wipeVendorData(vendorId);
	await _seed(vendorId, fixture);
}

async function _seed(vendorId: number, fixture: ArchetypeFixture): Promise<void> {
	const db = createDb();

	// ── Categories ──────────────────────────────────────────────────────────────
	const insertedCategories = await db
		.insert(catalogCategories)
		.values(fixture.categories.map(({ name, sortOrder }) => ({ vendorId, name, sortOrder })))
		.returning({ id: catalogCategories.id, name: catalogCategories.name });

	const categoryIdByKey = Object.fromEntries(
		fixture.categories.map((c, i) => [c.key, insertedCategories[i].id])
	);

	// ── Catalog items ───────────────────────────────────────────────────────────
	const seededItems = await db
		.insert(catalogItems)
		.values(
			fixture.items.map((item) => ({
				vendorId,
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

	// ── Modifiers ───────────────────────────────────────────────────────────────
	if (fixture.modifiers.length > 0) {
		const insertedModifiers = await db
			.insert(modifiers)
			.values(
				fixture.modifiers.map((m) => ({
					vendorId,
					name: m.name,
					isRequired: m.isRequired,
					maxSelections: m.maxSelections,
					sortOrder: m.sortOrder
				}))
			)
			.returning({ id: modifiers.id, name: modifiers.name });

		const modifierIdByKey: Record<string, number> = {};
		for (const m of fixture.modifiers) {
			const row = insertedModifiers.find((r) => r.name === m.name);
			if (row) modifierIdByKey[m.key] = row.id;
		}

		for (const m of fixture.modifiers) {
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
		for (const item of fixture.items) {
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
	}

	// ── Pickup locations ────────────────────────────────────────────────────────
	for (const loc of fixture.locations) {
		await db.insert(pickupLocations).values({ vendorId, ...loc });
	}

	// ── Pickup templates ────────────────────────────────────────────────────────
	for (const tmpl of fixture.templates) {
		await db.insert(pickupWindowTemplates).values({ vendorId, ...tmpl });
	}

	// ── Orders + order_items ────────────────────────────────────────────────────
	for (const order of fixture.orders) {
		const { items: lineItems, ...orderData } = order;
		const [newOrder] = await db
			.insert(orders)
			.values({ ...orderData, vendorId, items: lineItems })
			.returning({ id: orders.id });

		await db.insert(orderItems).values(
			lineItems.map((li) => ({
				orderId: newOrder.id,
				catalogItemId: itemIdByName[li.name] ?? null,
				name: li.name,
				quantity: li.quantity,
				unitPrice:
					li.basePrice + li.selectedModifiers.reduce((acc, m) => acc + m.priceAdjustment, 0),
				selectedModifiers: li.selectedModifiers
			}))
		);
	}

	// ── Promo codes ─────────────────────────────────────────────────────────────
	if (fixture.promoCodes.length > 0) {
		await db.insert(promoCodes).values(
			fixture.promoCodes.map((p) => ({
				vendorId,
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
	}

	// ── Vendor row: branding + settings ────────────────────────────────────────
	await db
		.update(vendor)
		.set({
			tagline: fixture.branding.tagline,
			logoUrl: fixture.branding.logoUrl,
			bannerUrl: fixture.branding.bannerUrl,
			faviconUrl: fixture.branding.faviconUrl,
			backgroundImageUrl: fixture.branding.backgroundImageUrl,
			backgroundColor: fixture.branding.backgroundColor,
			accentColor: fixture.branding.accentColor,
			foregroundColor: fixture.branding.foregroundColor,
			settings: fixture.settings,
			lastOrderNumber: fixture.orderCounter,
			updatedAt: new Date()
		})
		.where(sql`id = ${vendorId}`);

	// ── Team invitations ────────────────────────────────────────────────────────
	const ownerResult = await db.execute(
		sql`SELECT user_id FROM vendor_users WHERE vendor_id = ${vendorId} AND role = 'owner' LIMIT 1`
	);
	const ownerId = (ownerResult.rows[0] as { user_id: string } | undefined)?.user_id ?? null;

	if (ownerId && fixture.invitations.length > 0) {
		for (const inv of fixture.invitations) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + inv.expiresInDays);
			await db.insert(vendorInvitations).values({
				id: crypto.randomUUID(),
				vendorId,
				email: inv.email,
				role: inv.role,
				invitedByUserId: ownerId,
				expiresAt
			});
		}
	}
}
