import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq, and, sql } from 'drizzle-orm';
import { modifiers, modifierOptions, catalogItemModifiers } from '$lib/server/db/catalog';

export class ModifierActionError extends Error {
	constructor(
		public status: number,
		message: string
	) {
		super(message);
	}
}

export async function addModifierGroup(
	vendorId: number,
	itemId: number,
	name: string,
	isRequired: boolean,
	maxSelections: number
): Promise<{ id: number }> {
	// Item-scoped case-insensitive duplicate check
	const existing = await db
		.select({ id: modifiers.id })
		.from(modifiers)
		.innerJoin(catalogItemModifiers, eq(catalogItemModifiers.modifierId, modifiers.id))
		.where(
			and(
				eq(catalogItemModifiers.catalogItemId, itemId),
				eq(modifiers.vendorId, vendorId),
				sql`lower(${modifiers.name}) = lower(${name})`
			)
		)
		.limit(1);

	if (existing.length > 0) {
		throw new ModifierActionError(
			409,
			`A modifier group named "${name}" already exists on this item`
		);
	}

	const [mod] = await db
		.insert(modifiers)
		.values({ vendorId, name, isRequired, maxSelections })
		.returning({ id: modifiers.id });

	await db.insert(catalogItemModifiers).values({ catalogItemId: itemId, modifierId: mod.id });

	return { id: mod.id };
}

export async function updateModifierGroup(formData: FormData, vendorId: number) {
	const modifierId = parseInt(formData.get('modifierId')?.toString() ?? '');
	const name = formData.get('modifierName')?.toString().trim();
	if (!modifierId || !name) return fail(400, { modifierError: 'Invalid request' });

	// Authorize and find which item this group is attached to (for duplicate scope).
	const target = await db
		.select({ id: modifiers.id, itemId: catalogItemModifiers.catalogItemId })
		.from(modifiers)
		.innerJoin(catalogItemModifiers, eq(catalogItemModifiers.modifierId, modifiers.id))
		.where(and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)))
		.limit(1);

	if (target.length === 0) return fail(403, { modifierError: 'Not found' });

	// Self-excluded duplicate check: another modifier on the same item with the same name?
	const collision = await db
		.select({ id: modifiers.id })
		.from(modifiers)
		.innerJoin(catalogItemModifiers, eq(catalogItemModifiers.modifierId, modifiers.id))
		.where(
			and(
				eq(catalogItemModifiers.catalogItemId, target[0].itemId),
				eq(modifiers.vendorId, vendorId),
				sql`lower(${modifiers.name}) = lower(${name})`,
				sql`${modifiers.id} != ${modifierId}`
			)
		)
		.limit(1);

	if (collision.length > 0) {
		return fail(400, {
			modifierError: `A modifier group named "${name}" already exists on this item.`
		});
	}

	const isRequired = formData.get('isRequired') === 'on';
	const maxSelections = parseInt(formData.get('maxSelections')?.toString() ?? '1') || 1;

	await db
		.update(modifiers)
		.set({ name, isRequired, maxSelections })
		.where(and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)));

	return { success: true as const };
}

export async function deleteModifierGroup(vendorId: number, modifierId: number): Promise<void> {
	await db
		.delete(modifiers)
		.where(and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)));
}

export async function addModifierOption(
	vendorId: number,
	modifierId: number,
	name: string,
	priceAdjustment: number,
	isDefault: boolean
): Promise<void> {
	// Verify modifier belongs to vendor
	const mod = await db.query.modifiers.findFirst({
		where: and(eq(modifiers.id, modifierId), eq(modifiers.vendorId, vendorId)),
		columns: { id: true }
	});
	if (!mod) throw new ModifierActionError(403, 'Not found');

	// Group-scoped case-insensitive duplicate check
	const existing = await db
		.select({ id: modifierOptions.id })
		.from(modifierOptions)
		.where(
			and(
				eq(modifierOptions.modifierId, modifierId),
				sql`lower(${modifierOptions.name}) = lower(${name})`
			)
		)
		.limit(1);

	if (existing.length > 0) {
		throw new ModifierActionError(409, `An option named "${name}" already exists in this group`);
	}

	await db.insert(modifierOptions).values({ modifierId, name, priceAdjustment, isDefault });
}

export async function updateModifierOption(formData: FormData, vendorId: number) {
	const optionId = parseInt(formData.get('optionId')?.toString() ?? '');
	const name = formData.get('optionName')?.toString().trim();
	if (!optionId || !name) return fail(400, { modifierError: 'Invalid request' });

	// Authorize: option's modifier must belong to this vendor.
	const option = await db.query.modifierOptions.findFirst({
		where: eq(modifierOptions.id, optionId),
		with: { modifier: { columns: { id: true, vendorId: true } } }
	});
	if (!option || option.modifier.vendorId !== vendorId)
		return fail(403, { modifierError: 'Not found' });

	// Self-excluded duplicate check (case-insensitive) within the same group.
	const collision = await db
		.select({ id: modifierOptions.id })
		.from(modifierOptions)
		.where(
			and(
				eq(modifierOptions.modifierId, option.modifier.id),
				sql`lower(${modifierOptions.name}) = lower(${name})`,
				sql`${modifierOptions.id} != ${optionId}`
			)
		)
		.limit(1);

	if (collision.length > 0) {
		return fail(400, {
			modifierError: `An option named "${name}" already exists in this group.`
		});
	}

	const priceAdjustmentRaw = formData.get('priceAdjustment')?.toString() ?? '0';
	const priceAdjustment = Math.round(parseFloat(priceAdjustmentRaw) * 100) || 0;
	const isDefault = formData.get('isDefault') === 'on';

	await db
		.update(modifierOptions)
		.set({ name, priceAdjustment, isDefault })
		.where(eq(modifierOptions.id, optionId));

	return { success: true as const };
}

export async function deleteModifierOption(vendorId: number, optionId: number): Promise<void> {
	const option = await db.query.modifierOptions.findFirst({
		where: eq(modifierOptions.id, optionId),
		with: { modifier: { columns: { vendorId: true } } }
	});
	if (!option || option.modifier.vendorId !== vendorId) {
		throw new ModifierActionError(403, 'Not found');
	}
	await db.delete(modifierOptions).where(eq(modifierOptions.id, optionId));
}
