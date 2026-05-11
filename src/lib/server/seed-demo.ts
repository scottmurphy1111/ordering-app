import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendor, vendorUsers, vendorInvitations } from '$lib/server/db/vendor';
import {
	catalogCategories,
	catalogItems,
	modifiers,
	modifierOptions,
	catalogItemModifiers
} from '$lib/server/db/catalog';
import { orders, orderItems } from '$lib/server/db/orders';
import { pickupLocations, pickupWindowTemplates } from '$lib/server/db/pickup';
import { promoCodes } from '$lib/server/db/promos';
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
} from './seed-data';

export async function seedDemoVendor(vendorId: number) {
	// ── Categories ──────────────────────────────────────────────────────────────
	const insertedCategories = await db
		.insert(catalogCategories)
		.values(demoCategories.map(({ name, sortOrder }) => ({ vendorId, name, sortOrder })))
		.returning({ id: catalogCategories.id, name: catalogCategories.name });

	const categoryIdByKey = Object.fromEntries(
		demoCategories.map((dc, i) => [dc.key, insertedCategories[i].id])
	);

	// ── Catalog items ───────────────────────────────────────────────────────────
	const seededItems = await db
		.insert(catalogItems)
		.values(
			demoItems.map((item) => ({
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
	const insertedModifiers = await db
		.insert(modifiers)
		.values(
			demoModifiers.map((m) => ({
				vendorId,
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

	// ── Pickup location ─────────────────────────────────────────────────────────
	await db.insert(pickupLocations).values({
		vendorId,
		name: demoPickupLocation.name,
		address: demoPickupLocation.address,
		notes: demoPickupLocation.notes,
		sortOrder: demoPickupLocation.sortOrder,
		isActive: demoPickupLocation.isActive
	});

	// ── Pickup template ─────────────────────────────────────────────────────────
	await db.insert(pickupWindowTemplates).values({ vendorId, ...demoTemplate });

	// ── Orders + order_items ────────────────────────────────────────────────────
	for (const order of demoOrders) {
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
					li.basePrice +
					li.selectedModifiers.reduce((acc, m) => acc + m.priceAdjustment, 0),
				selectedModifiers: li.selectedModifiers
			}))
		);
	}

	// ── Promo codes ─────────────────────────────────────────────────────────────
	await db.insert(promoCodes).values(
		demoPromoCodes.map((p) => ({
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

	// ── Vendor row: branding + settings ────────────────────────────────────────
	// Overwrites branding/settings/tagline with demo values.
	// Never touches: name, slug, email, phone, Stripe fields, subscription state.
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
		.where(eq(vendor.id, vendorId));

	// ── Team invitation ─────────────────────────────────────────────────────────
	// Skipped silently if no owner found (e.g., during signup before vendor_users
	// is populated). The invitation is non-critical; the rest of the seed is complete.
	const owner = await db.query.vendorUsers.findFirst({
		where: and(eq(vendorUsers.vendorId, vendorId), eq(vendorUsers.role, 'owner')),
		columns: { userId: true }
	});

	if (owner) {
		for (const inv of demoInvitations) {
			const expiresAt = new Date();
			expiresAt.setDate(expiresAt.getDate() + inv.expiresInDays);
			await db.insert(vendorInvitations).values({
				id: crypto.randomUUID(),
				vendorId,
				email: inv.email,
				role: inv.role,
				invitedByUserId: owner.userId,
				expiresAt
			});
		}
	}
}
