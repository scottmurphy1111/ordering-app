import { db } from '$lib/server/db';
import { catalogCategories, catalogItems } from '$lib/server/db/catalog';
import { orders, orderItems } from '$lib/server/db/orders';

export async function seedDemoVendor(vendorId: number) {
	const [breads, pastries] = await db
		.insert(catalogCategories)
		.values([
			{ vendorId, name: 'Breads', sortOrder: 1 },
			{ vendorId, name: 'Pastries', sortOrder: 2 }
		])
		.returning({ id: catalogCategories.id });

	const seededItems = await db
		.insert(catalogItems)
		.values([
			{
				vendorId,
				categoryId: breads.id,
				name: 'Sourdough Loaf',
				description:
					'Country-style sourdough with a crackling crust and open crumb. Baked fresh each morning.',
				price: 1200,
				sortOrder: 1
			},
			{
				vendorId,
				categoryId: breads.id,
				name: 'Classic Baguette',
				description:
					'Traditional French baguette — crisp outside, pillowy inside. Best enjoyed same day.',
				price: 550,
				sortOrder: 2
			},
			{
				vendorId,
				categoryId: breads.id,
				name: 'Honey-Lavender Focaccia',
				description:
					'Thick, pillowy focaccia drizzled with local honey and studded with dried lavender buds.',
				price: 900,
				sortOrder: 3
			},
			{
				vendorId,
				categoryId: pastries.id,
				name: 'Cinnamon Rolls',
				description:
					'Soft brioche dough, cinnamon-brown sugar filling, finished with cream cheese glaze. 2-pack.',
				price: 750,
				sortOrder: 1
			},
			{
				vendorId,
				categoryId: pastries.id,
				name: 'Blueberry Scones',
				description:
					'Buttermilk scones loaded with wild blueberries and a lemon-sugar glaze. 2-pack.',
				price: 650,
				sortOrder: 2
			},
			{
				vendorId,
				categoryId: pastries.id,
				name: 'Butter Croissants',
				description: 'Laminated with European-style butter for a shattery, flaky exterior. 2-pack.',
				price: 700,
				sortOrder: 3
			}
		])
		.returning({ id: catalogItems.id, name: catalogItems.name, price: catalogItems.price });

	const byName = Object.fromEntries(seededItems.map((i) => [i.name, i]));

	const suffix = String(vendorId).padStart(3, '0');

	const demoOrders = [
		{
			vendorId,
			orderNumber: `DEMO-${suffix}-1001`,
			customerName: 'Maya Hoffman',
			customerEmail: 'maya@example.com',
			type: 'pickup',
			status: 'received' as const,
			paymentStatus: 'paid' as const,
			subtotal: 1900,
			tax: 157,
			total: 2057,
			items: [
				{ name: 'Sourdough Loaf', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Butter Croissants', quantity: 1, basePrice: 700, selectedModifiers: [] }
			]
		},
		{
			vendorId,
			orderNumber: `DEMO-${suffix}-1002`,
			customerName: 'Tomás Rivera',
			customerEmail: 'tomas@example.com',
			type: 'pickup',
			status: 'preparing' as const,
			paymentStatus: 'paid' as const,
			subtotal: 2300,
			tax: 190,
			total: 2490,
			items: [
				{ name: 'Honey-Lavender Focaccia', quantity: 1, basePrice: 900, selectedModifiers: [] },
				{ name: 'Cinnamon Rolls', quantity: 1, basePrice: 750, selectedModifiers: [] },
				{ name: 'Blueberry Scones', quantity: 1, basePrice: 650, selectedModifiers: [] }
			]
		},
		{
			vendorId,
			orderNumber: `DEMO-${suffix}-1003`,
			customerName: 'Cleo Okafor',
			customerEmail: 'cleo@example.com',
			type: 'pickup',
			status: 'ready' as const,
			paymentStatus: 'paid' as const,
			subtotal: 1750,
			tax: 144,
			total: 1894,
			items: [
				{ name: 'Classic Baguette', quantity: 1, basePrice: 550, selectedModifiers: [] },
				{ name: 'Butter Croissants', quantity: 1, basePrice: 700, selectedModifiers: [] },
				{ name: 'Blueberry Scones', quantity: 1, basePrice: 650, selectedModifiers: [] }
			]
		},
		{
			vendorId,
			orderNumber: `DEMO-${suffix}-1004`,
			customerName: 'James Sutton',
			customerEmail: 'james@example.com',
			type: 'pickup',
			status: 'fulfilled' as const,
			paymentStatus: 'paid' as const,
			subtotal: 2650,
			tax: 219,
			total: 2869,
			items: [
				{ name: 'Sourdough Loaf', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Classic Baguette', quantity: 1, basePrice: 550, selectedModifiers: [] },
				{ name: 'Cinnamon Rolls', quantity: 1, basePrice: 750, selectedModifiers: [] },
				{ name: 'Honey-Lavender Focaccia', quantity: 1, basePrice: 900, selectedModifiers: [] }
			]
		}
	];

	for (const order of demoOrders) {
		const { items: lineItems, ...orderData } = order;
		const [newOrder] = await db
			.insert(orders)
			.values({ ...orderData, items: lineItems })
			.returning({ id: orders.id });

		await db.insert(orderItems).values(
			lineItems.map((li) => ({
				orderId: newOrder.id,
				catalogItemId: byName[li.name]?.id ?? null,
				name: li.name,
				quantity: li.quantity,
				unitPrice: li.basePrice
			}))
		);
	}
}
