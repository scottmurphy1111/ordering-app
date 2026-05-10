import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendor } from '$lib/server/db/vendor';
import { catalogCategories, catalogItems } from '$lib/server/db/catalog';
import { orders, orderItems } from '$lib/server/db/orders';
import { pickupWindowTemplates } from '$lib/server/db/pickup';

export async function seedDemoVendor(vendorId: number) {
	const [breads, pastries, customOrders] = await db
		.insert(catalogCategories)
		.values([
			{ vendorId, name: 'Breads', sortOrder: 1 },
			{ vendorId, name: 'Pastries', sortOrder: 2 },
			{ vendorId, name: 'Custom orders', sortOrder: 3 }
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
			},
			{
				vendorId,
				categoryId: customOrders.id,
				name: 'Custom Wedding Cake',
				description:
					'Multi-tier wedding cake built to your specs. Contact us to discuss flavors, fillings, and design. Requires minimum 6 weeks notice.',
				price: 35000,
				sortOrder: 1,
				pickupType: 'custom_date' as const,
				customDateLeadDays: 42
			},
			{
				vendorId,
				categoryId: customOrders.id,
				name: 'Custom Birthday Cake',
				description:
					'Personalized birthday cake — your flavor, your design. Minimum 2 weeks advance order.',
				price: 8500,
				sortOrder: 2,
				pickupType: 'custom_date' as const,
				customDateLeadDays: 14
			},
			{
				vendorId,
				categoryId: customOrders.id,
				name: 'Holiday Gift Box',
				description:
					'Curated seasonal box: 2 croissants, 1 sourdough loaf, and a seasonal pastry. Schedule your pickup date.',
				price: 6500,
				sortOrder: 3,
				pickupType: 'custom_date' as const,
				customDateLeadDays: 7
			}
		])
		.returning({ id: catalogItems.id, name: catalogItems.name, price: catalogItems.price });

	const byName = Object.fromEntries(seededItems.map((i) => [i.name, i]));

	// Daily window template for custom-order fulfillment days; skips major holidays
	await db.insert(pickupWindowTemplates).values({
		vendorId,
		name: 'Daily Custom Order Pickup',
		recurrence: 'FREQ=DAILY',
		windowStart: '07:00:00',
		windowEnd: '10:00:00',
		isActive: true,
		exdates: ['2026-12-25', '2026-12-26']
	});

	const demoOrders = [
		{
			vendorId,
			orderNumber: '#1',
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
			orderNumber: '#2',
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
			orderNumber: '#3',
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
			orderNumber: '#4',
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
		},
		{
			vendorId,
			orderNumber: '#5',
			customerName: 'Riley Park',
			customerEmail: 'riley@example.com',
			type: 'pickup',
			status: 'pending_approval' as const,
			paymentStatus: 'pending' as const,
			pickupType: 'custom_date' as const,
			subtotal: 35000,
			tax: 2888,
			total: 37888,
			scheduledFor: new Date('2026-09-15T12:00:00Z'),
			stripeCustomerId: 'cus_demo_riley',
			stripeSetupIntentId: 'seti_demo_riley',
			notes: 'Three-tier cake — vanilla, lemon, and chocolate. Garden party theme, blush and sage colors.',
			items: [
				{ name: 'Custom Wedding Cake', quantity: 1, basePrice: 35000, selectedModifiers: [] }
			]
		},
		{
			vendorId,
			orderNumber: '#6',
			customerName: 'Avery Chen',
			customerEmail: 'avery@example.com',
			type: 'pickup',
			status: 'payment_failed' as const,
			paymentStatus: 'failed' as const,
			pickupType: 'custom_date' as const,
			subtotal: 8500,
			tax: 701,
			total: 9201,
			scheduledFor: new Date('2026-07-20T12:00:00Z'),
			stripeCustomerId: 'cus_demo_avery',
			stripePaymentIntentId: 'pi_demo_avery',
			notes: 'Chocolate cake, rainbow sprinkles, "Happy 10th Birthday Sofia!" in blue frosting.',
			items: [
				{ name: 'Custom Birthday Cake', quantity: 1, basePrice: 8500, selectedModifiers: [] }
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

	// Set counter so the next real order continues from #7
	await db.update(vendor).set({ lastOrderNumber: 6 }).where(eq(vendor.id, vendorId));
}
