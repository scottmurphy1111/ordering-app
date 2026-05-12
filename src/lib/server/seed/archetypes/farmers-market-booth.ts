import type { ArchetypeFixture } from '../types';

// taxRate: 0.0475 (sample state-level rate for preserved foods at a farmers market).
// Order math verified: tax = floor(subtotal × 0.0475).
export const farmersMarketBooth: ArchetypeFixture = {
	key: 'farmers-market-booth',
	label: 'Farmers market booth',
	description:
		'Market vendor selling small-batch jams, pickles, and honey at a weekly Saturday market. All orders placed ahead for booth pickup.',
	fulfillmentModel: 'pickup_only',
	allowedFulfillmentModels: ['pickup_only', 'hybrid'],
	vendorType: 'market_vendor',

	categories: [
		{ name: 'Jams & Preserves', key: 'jams', sortOrder: 1 },
		{ name: 'Pickles & Ferments', key: 'pickles', sortOrder: 2 },
		{ name: 'Honey & Spreads', key: 'honey', sortOrder: 3 }
	],

	items: [
		{
			categoryKey: 'jams',
			name: 'Strawberry Rhubarb Jam',
			description:
				'8 oz jar. Bright, tart, and not too sweet. Made with local strawberries and garden rhubarb.',
			price: 1200,
			sortOrder: 1
		},
		{
			categoryKey: 'jams',
			name: 'Blueberry Lavender Jam',
			description:
				'8 oz jar. Wild blueberries with a hint of culinary lavender. Pairs well with goat cheese.',
			price: 1300,
			sortOrder: 2
		},
		{
			categoryKey: 'jams',
			name: 'Peach Ginger Jam',
			description:
				'8 oz jar. Late-summer peaches with fresh ginger. Chunky style, not too sweet.',
			price: 1200,
			sortOrder: 3
		},
		{
			categoryKey: 'pickles',
			name: 'Garlic Dill Pickles',
			description:
				'16 oz jar. Classic dill brine with roasted garlic and black pepper. Crunchy.',
			price: 1100,
			sortOrder: 1
		},
		{
			categoryKey: 'pickles',
			name: 'Bread & Butter Pickles',
			description:
				'16 oz jar. Sweet-tangy sliced cucumbers. The classic on a burger or grilled cheese.',
			price: 1000,
			sortOrder: 2
		},
		{
			categoryKey: 'pickles',
			name: 'Fermented Kraut',
			description:
				'16 oz jar. Traditional lacto-fermented cabbage. No vinegar — just salt and time.',
			price: 1100,
			sortOrder: 3
		},
		{
			categoryKey: 'honey',
			name: 'Wildflower Honey',
			description:
				'12 oz jar. Raw, unfiltered wildflower honey from local hives. Rich amber color.',
			price: 1500,
			sortOrder: 1
		},
		{
			categoryKey: 'honey',
			name: 'Hot Honey',
			description:
				'8 oz jar. Wildflower honey infused with dried chili. Drizzle on pizza, fried chicken, or cheese boards.',
			price: 1200,
			sortOrder: 2
		},
		{
			categoryKey: 'honey',
			name: 'Sunflower Seed Butter',
			description:
				'8 oz jar. Stone-ground from roasted sunflower seeds. No added sugar or oils.',
			price: 1000,
			sortOrder: 3
		}
	],

	modifiers: [],

	locations: [
		{
			name: 'Downtown Farmers Market Booth',
			address: { street: '200 W Main St', city: 'Carrboro', state: 'NC', zip: '27510' },
			notes:
				'Find us at Booth 14, east row. Pre-orders are on the right side of the table — look for the folder with your name. Market runs 7am–noon every Saturday.',
			sortOrder: 0,
			isActive: true
		}
	],

	templates: [
		{
			name: 'Saturday Market Booth',
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '08:00:00',
			windowEnd: '12:00:00',
			isActive: true,
			exdates: ['2026-12-27']
		}
	],

	branding: {
		tagline: 'Small batch. Big flavor.',
		logoUrl: '/seed-assets/logo.svg',
		bannerUrl: '/seed-assets/banner.svg',
		faviconUrl: '/seed-assets/favicon.svg',
		backgroundImageUrl: '/seed-assets/background.svg',
		backgroundColor: '#3a1f0a',
		accentColor: '#e8971a',
		foregroundColor: '#fdf3e2'
	},

	settings: {
		currency: 'USD',
		taxRate: 0.0475,
		enableTips: false,
		defaultTipPercentages: [15, 18, 20],
		allowPickup: true,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 0,
		asapPickupEnabled: false,
		hours: {
			monday: { closed: true },
			tuesday: { closed: true },
			wednesday: { closed: true },
			thursday: { closed: true },
			friday: { closed: true },
			saturday: { open: '08:00', close: '12:00' },
			sunday: { closed: true }
		},
		specialHours: [],
		loyalty: {
			enabled: false,
			type: 'stamps',
			stamps: { stampsPerOrder: 1, rewardAt: 10, rewardDescription: 'Free jar of your choice' },
			points: { pointsPerDollar: 1, redeemAt: 100, redeemValue: 500 }
		}
	},

	promoCodes: [
		{
			code: 'MARKET10',
			description: '10% off orders over $20',
			type: 'percent',
			amount: 10,
			minOrderAmount: 2000,
			maxUses: null,
			expiresAt: null,
			isActive: true
		}
	],

	invitations: [{ email: 'alex@foxfern-demo.com', role: 'staff', expiresInDays: 14 }],

	// taxRate: 0.0475. Tax = floor(subtotal × 0.0475).
	// #1: 1200+1100=2300. floor(2300×0.0475)=floor(109.25)=109. total=2409.
	// #2: 1300+1500=2800. floor(2800×0.0475)=floor(133)=133. total=2933.
	// #3: 1100+1000+1100=3200. floor(3200×0.0475)=floor(152)=152. total=3352.
	// #4: 1500+1200=2700. floor(2700×0.0475)=floor(128.25)=128. total=2828.
	// #5: 1200×2+1000=3400. floor(3400×0.0475)=floor(161.5)=161. total=3561.
	// #6: 1200+1300+1200=3700. floor(3700×0.0475)=floor(175.75)=175. total=3875.
	orders: [
		{
			orderNumber: '#1',
			customerName: 'Jordan Kim',
			customerEmail: 'jordan@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			subtotal: 2300,
			tax: 109,
			total: 2409,
			items: [
				{ name: 'Strawberry Rhubarb Jam', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Garlic Dill Pickles', quantity: 1, basePrice: 1100, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#2',
			customerName: 'Fatima Hassan',
			customerEmail: 'fatima@example.com',
			type: 'pickup',
			status: 'preparing',
			paymentStatus: 'paid',
			subtotal: 2800,
			tax: 133,
			total: 2933,
			items: [
				{ name: 'Blueberry Lavender Jam', quantity: 1, basePrice: 1300, selectedModifiers: [] },
				{ name: 'Wildflower Honey', quantity: 1, basePrice: 1500, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#3',
			customerName: 'Sam Nguyen',
			customerEmail: 'sam@example.com',
			type: 'pickup',
			status: 'ready',
			paymentStatus: 'paid',
			subtotal: 3200,
			tax: 152,
			total: 3352,
			items: [
				{ name: 'Garlic Dill Pickles', quantity: 1, basePrice: 1100, selectedModifiers: [] },
				{ name: 'Bread & Butter Pickles', quantity: 1, basePrice: 1000, selectedModifiers: [] },
				{ name: 'Fermented Kraut', quantity: 1, basePrice: 1100, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#4',
			customerName: 'Bria Townsend',
			customerEmail: 'bria@example.com',
			type: 'pickup',
			status: 'fulfilled',
			paymentStatus: 'paid',
			subtotal: 2700,
			tax: 128,
			total: 2828,
			items: [
				{ name: 'Wildflower Honey', quantity: 1, basePrice: 1500, selectedModifiers: [] },
				{ name: 'Hot Honey', quantity: 1, basePrice: 1200, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#5',
			customerName: 'Luis Reyes',
			customerEmail: 'luis@example.com',
			type: 'pickup',
			status: 'fulfilled',
			paymentStatus: 'paid',
			subtotal: 3400,
			tax: 161,
			total: 3561,
			items: [
				{ name: 'Peach Ginger Jam', quantity: 2, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Sunflower Seed Butter', quantity: 1, basePrice: 1000, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#6',
			customerName: 'Ingrid Svensson',
			customerEmail: 'ingrid@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			subtotal: 3700,
			tax: 175,
			total: 3875,
			items: [
				{ name: 'Strawberry Rhubarb Jam', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Blueberry Lavender Jam', quantity: 1, basePrice: 1300, selectedModifiers: [] },
				{ name: 'Hot Honey', quantity: 1, basePrice: 1200, selectedModifiers: [] }
			]
		}
	],

	orderCounter: 6
};
