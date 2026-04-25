import { db } from '$lib/server/db';
import { menuCategories, menuItems } from '$lib/server/db/menu';
import { orders, orderItems } from '$lib/server/db/orders';

export async function seedDemoTenant(tenantId: number) {
	const [drinks, food] = await db
		.insert(menuCategories)
		.values([
			{ tenantId, name: 'Drinks', sortOrder: 1 },
			{ tenantId, name: 'Food', sortOrder: 2 }
		])
		.returning({ id: menuCategories.id });

	const seededItems = await db
		.insert(menuItems)
		.values([
			{
				tenantId,
				categoryId: drinks.id,
				name: 'Flat White',
				description: 'Double ristretto, steamed whole milk, silky microfoam.',
				price: 550,
				sortOrder: 1
			},
			{
				tenantId,
				categoryId: drinks.id,
				name: 'Iced Latte',
				description: 'Espresso over ice with your choice of milk.',
				price: 600,
				sortOrder: 2
			},
			{
				tenantId,
				categoryId: drinks.id,
				name: 'Fresh Orange Juice',
				description: 'Cold-pressed, served immediately.',
				price: 500,
				sortOrder: 3
			},
			{
				tenantId,
				categoryId: food.id,
				name: 'Avocado Toast',
				description: 'Sourdough, smashed avo, chilli flakes, poached egg.',
				price: 1400,
				sortOrder: 1
			},
			{
				tenantId,
				categoryId: food.id,
				name: 'Acai Bowl',
				description: 'Blended acai, banana, granola, honey, fresh berries.',
				price: 1250,
				sortOrder: 2
			},
			{
				tenantId,
				categoryId: food.id,
				name: 'Granola Parfait',
				description: 'House granola, Greek yoghurt, seasonal fruit compote.',
				price: 900,
				sortOrder: 3
			}
		])
		.returning({ id: menuItems.id, name: menuItems.name, price: menuItems.price });

	// Map by name for convenience
	const byName = Object.fromEntries(seededItems.map((i) => [i.name, i]));

	// Seed 4 demo orders with mixed statuses
	const suffix = String(tenantId).padStart(3, '0');

	const demoOrders = [
		{
			tenantId,
			orderNumber: `DEMO-${suffix}-1001`,
			customerName: 'Jamie Chen',
			customerEmail: 'jamie@example.com',
			type: 'pickup',
			status: 'received' as const,
			paymentStatus: 'paid' as const,
			subtotal: 1100,
			tax: 99,
			total: 1199,
			items: [
				{ name: 'Flat White', quantity: 1, unitPrice: 550 },
				{ name: 'Iced Latte', quantity: 1, unitPrice: 550 }
			]
		},
		{
			tenantId,
			orderNumber: `DEMO-${suffix}-1002`,
			customerName: 'Priya Nair',
			customerEmail: 'priya@example.com',
			type: 'dine-in',
			status: 'preparing' as const,
			paymentStatus: 'paid' as const,
			subtotal: 2300,
			tax: 207,
			total: 2507,
			items: [
				{ name: 'Avocado Toast', quantity: 1, unitPrice: 1400 },
				{ name: 'Fresh Orange Juice', quantity: 1, unitPrice: 500 },
				{ name: 'Flat White', quantity: 1, unitPrice: 550 }
			]
		},
		{
			tenantId,
			orderNumber: `DEMO-${suffix}-1003`,
			customerName: 'Marcus Webb',
			customerEmail: 'marcus@example.com',
			type: 'pickup',
			status: 'ready' as const,
			paymentStatus: 'paid' as const,
			subtotal: 2150,
			tax: 194,
			total: 2344,
			items: [
				{ name: 'Acai Bowl', quantity: 1, unitPrice: 1250 },
				{ name: 'Iced Latte', quantity: 1, unitPrice: 600 },
				{ name: 'Granola Parfait', quantity: 1, unitPrice: 900 }
			]
		},
		{
			tenantId,
			orderNumber: `DEMO-${suffix}-1004`,
			customerName: 'Sofia Lindqvist',
			customerEmail: 'sofia@example.com',
			type: 'pickup',
			status: 'fulfilled' as const,
			paymentStatus: 'paid' as const,
			subtotal: 1800,
			tax: 162,
			total: 1962,
			items: [
				{ name: 'Granola Parfait', quantity: 1, unitPrice: 900 },
				{ name: 'Flat White', quantity: 1, unitPrice: 550 },
				{ name: 'Avocado Toast', quantity: 1, unitPrice: 1400 }
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
				menuItemId: byName[li.name]?.id ?? null,
				name: li.name,
				quantity: li.quantity,
				unitPrice: li.unitPrice
			}))
		);
	}
}
