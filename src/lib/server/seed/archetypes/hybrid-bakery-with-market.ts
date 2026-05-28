import type { ArchetypeFixture } from '../types';

export const hybridBakeryWithMarket: ArchetypeFixture = {
	key: 'hybrid-bakery-with-market',
	label: 'Bakery with market booth',
	description:
		'A bakery with a brick-and-mortar storefront plus a Saturday farmers market booth. Daily walk-in retail during operating hours, weekly Saturday market booth for preorder pickup.',
	fulfillmentModel: 'hybrid',
	allowedFulfillmentModels: ['hybrid'],
	vendorType: 'bakery',

	categories: [
		{ name: 'Breads', key: 'breads', sortOrder: 1 },
		{ name: 'Pastries', key: 'pastries', sortOrder: 2 },
		{ name: 'Custom orders', key: 'customOrders', sortOrder: 3 }
	],

	items: [
		{
			categoryKey: 'breads',
			name: 'Sourdough Loaf',
			description:
				'Country-style sourdough with a crackling crust and open crumb. Baked fresh each morning.',
			price: 1200,
			sortOrder: 1,
			availabilityMode: 'always'
		},
		{
			categoryKey: 'breads',
			name: 'Classic Baguette',
			description:
				'Traditional French baguette — crisp outside, pillowy inside. Best enjoyed same day.',
			price: 550,
			sortOrder: 2,
			availabilityMode: 'always'
		},
		{
			categoryKey: 'breads',
			name: 'Honey-Lavender Focaccia',
			description:
				'Thick, pillowy focaccia drizzled with local honey and studded with dried lavender buds.',
			price: 900,
			sortOrder: 3,
			availabilityMode: 'always'
		},
		{
			categoryKey: 'pastries',
			name: 'Cinnamon Rolls',
			description:
				'Soft brioche dough, cinnamon-brown sugar filling, finished with cream cheese glaze. 2-pack.',
			price: 750,
			sortOrder: 1,
			availabilityMode: 'storefront_only',
			modifierKeys: ['glaze', 'add-ons']
		},
		{
			categoryKey: 'pastries',
			name: 'Blueberry Scones',
			description:
				'Buttermilk scones loaded with wild blueberries and a lemon-sugar glaze. 2-pack.',
			price: 650,
			sortOrder: 2,
			availabilityMode: 'storefront_only',
			modifierKeys: ['add-ons']
		},
		{
			categoryKey: 'pastries',
			name: 'Butter Croissants',
			description: 'Laminated with European-style butter for a shattery, flaky exterior. 2-pack.',
			price: 700,
			sortOrder: 3,
			availabilityMode: 'storefront_only',
			modifierKeys: ['add-ons']
		},
		{
			categoryKey: 'customOrders',
			name: 'Custom Wedding Cake',
			description:
				'Multi-tier wedding cake built to your specs. Contact us to discuss flavors, fillings, and design. Requires minimum 6 weeks notice.',
			price: 35000,
			sortOrder: 1,
			pickupType: 'custom_date',
			customDateLeadDays: 42,
			modifierKeys: ['size', 'glaze']
		},
		{
			categoryKey: 'customOrders',
			name: 'Custom Birthday Cake',
			description:
				'Personalized birthday cake — your flavor, your design. Minimum 2 weeks advance order.',
			price: 8500,
			sortOrder: 2,
			pickupType: 'custom_date',
			customDateLeadDays: 14,
			modifierKeys: ['size', 'glaze']
		},
		{
			categoryKey: 'customOrders',
			name: 'Holiday Gift Box',
			description:
				'Curated seasonal box: 2 croissants, 1 sourdough loaf, and a seasonal pastry. Schedule your pickup date.',
			price: 6500,
			sortOrder: 3,
			pickupType: 'custom_date',
			customDateLeadDays: 7
		}
	],

	modifiers: [
		{
			key: 'size',
			name: 'Size',
			isRequired: true,
			maxSelections: 1,
			sortOrder: 1,
			options: [
				{ name: 'Small (6")', priceAdjustment: 0, isDefault: true, sortOrder: 1 },
				{ name: 'Medium (8")', priceAdjustment: 300, isDefault: false, sortOrder: 2 },
				{ name: 'Large (10")', priceAdjustment: 700, isDefault: false, sortOrder: 3 }
			]
		},
		{
			key: 'glaze',
			name: 'Glaze',
			isRequired: false,
			maxSelections: 1,
			sortOrder: 2,
			options: [
				{ name: 'Lemon', priceAdjustment: 0, isDefault: false, sortOrder: 1 },
				{ name: 'Vanilla bean', priceAdjustment: 0, isDefault: false, sortOrder: 2 },
				{ name: 'Chocolate ganache', priceAdjustment: 150, isDefault: false, sortOrder: 3 }
			]
		},
		{
			key: 'add-ons',
			name: 'Add-ons',
			isRequired: false,
			maxSelections: 3,
			sortOrder: 3,
			options: [
				{ name: 'Extra butter', priceAdjustment: 100, isDefault: false, sortOrder: 1 },
				{ name: 'Jam packet', priceAdjustment: 75, isDefault: false, sortOrder: 2 },
				{ name: 'Local honey drizzle', priceAdjustment: 150, isDefault: false, sortOrder: 3 },
				{ name: 'Powdered sugar', priceAdjustment: 0, isDefault: false, sortOrder: 4 }
			]
		}
	],

	locations: [
		{
			name: 'Main Storefront',
			address: { street: '142 Mill Street', city: 'Winston-Salem', state: 'NC', zip: '27101' },
			notes:
				'Enter through the side door on Mill Street. Parking available in the lot behind the building. Pickup window faces the courtyard.',
			sortOrder: 0,
			isActive: true
		},
		{
			name: 'Saturday Farmers Market Booth',
			address: { street: '300 S Marshall St', city: 'Winston-Salem', state: 'NC', zip: '27101' },
			notes:
				'Find us at the Cobblestone Farmers Market, booth B-4. Open 8am–1pm most Saturdays. Pre-orders are on the back table.',
			sortOrder: 1,
			isActive: true
		}
	],

	templates: [
		{
			name: 'Daily Custom Order Pickup',
			recurrence: 'FREQ=DAILY',
			windowStart: '07:00:00',
			windowEnd: '10:00:00',
			isActive: true,
			exdates: ['2026-12-25', '2026-12-26']
		},
		{
			name: 'Saturday Market Pickup',
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '08:00:00',
			windowEnd: '13:00:00',
			isActive: true,
			exdates: ['2026-12-27']
		}
	],

	hours: [
		{ dayOfWeek: 'tuesday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'wednesday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'thursday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'friday', openTime: '07:00', closeTime: '19:00' },
		{ dayOfWeek: 'saturday', openTime: '08:00', closeTime: '15:00' }
	],
	hoursExceptions: [],

	branding: {
		tagline: 'Baked fresh daily since 2018',
		logoUrl: '/seed-assets/logo-hybrid-bakery.svg',
		heroImageUrl: '/seed-assets/hero-placeholder.webp',
		faviconUrl: '/seed-assets/favicon.svg',
		backgroundColor: '#2a3a26',
		accentColor: '#a8b884',
		foregroundColor: '#eef2e6',
		fontPair: 'fraunces-dm-sans',
		headerMode: 'logo',
		heroDisplayMode: 'headline_tagline',
		heroHeadline: 'Welcome to Two Loaves'
	},

	settings: {
		currency: 'USD',
		taxRate: 0.0825,
		enableTips: true,
		defaultTipPercentages: [15, 18, 20, 25],
		allowPickup: true,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 20,
		asapPickupEnabled: true,
		loyalty: {
			enabled: true,
			type: 'stamps',
			stamps: {
				stampsPerOrder: 1,
				rewardAt: 10,
				rewardDescription: 'Free pastry of your choice (up to $6.50)'
			},
			points: { pointsPerDollar: 1, redeemAt: 100, redeemValue: 500 }
		}
	},

	promoCodes: [
		{
			code: 'WELCOME10',
			description: '10% off your first order',
			type: 'percent',
			amount: 10,
			minOrderAmount: 0,
			maxUses: null,
			expiresAt: null,
			isActive: true
		},
		{
			code: 'BREAD5',
			description: '$5 off orders over $25',
			type: 'fixed',
			amount: 500,
			minOrderAmount: 2500,
			maxUses: 100,
			expiresAt: new Date('2026-12-31T23:59:59Z'),
			isActive: true
		}
	],

	invitations: [{ email: 'morgan@hearthandcrumb-demo.com', role: 'staff', expiresInDays: 14 }],

	// Order #2: Cinnamon Rolls with chocolate ganache + honey drizzle modifiers.
	//   Item totals: 900 + (750+150+150) + 650 = 2600. Tax: floor(2600×0.0825)=214. Total: 2814.
	// Order #3: WELCOME10 promo (10% off). Items: 550+700+650=1900. Discount: 190.
	//   After discount: 1710. Tax: floor(1710×0.0825)=141. Total: 1851.
	orders: [
		{
			orderNumber: '#1',
			customerName: 'Maya Hoffman',
			customerEmail: 'maya@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			subtotal: 1900,
			tax: 157,
			total: 2057,
			items: [
				{ name: 'Sourdough Loaf', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Butter Croissants', quantity: 1, basePrice: 700, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#2',
			customerName: 'Tomás Rivera',
			customerEmail: 'tomas@example.com',
			type: 'pickup',
			status: 'preparing',
			paymentStatus: 'paid',
			subtotal: 2600,
			tax: 214,
			total: 2814,
			items: [
				{ name: 'Honey-Lavender Focaccia', quantity: 1, basePrice: 900, selectedModifiers: [] },
				{
					name: 'Cinnamon Rolls',
					quantity: 1,
					basePrice: 750,
					selectedModifiers: [
						{ name: 'Chocolate ganache', priceAdjustment: 150 },
						{ name: 'Local honey drizzle', priceAdjustment: 150 }
					]
				},
				{ name: 'Blueberry Scones', quantity: 1, basePrice: 650, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#3',
			customerName: 'Cleo Okafor',
			customerEmail: 'cleo@example.com',
			type: 'pickup',
			status: 'ready',
			paymentStatus: 'paid',
			subtotal: 1900,
			discount: 190,
			promoCode: 'WELCOME10',
			tax: 141,
			total: 1851,
			items: [
				{ name: 'Classic Baguette', quantity: 1, basePrice: 550, selectedModifiers: [] },
				{ name: 'Butter Croissants', quantity: 1, basePrice: 700, selectedModifiers: [] },
				{ name: 'Blueberry Scones', quantity: 1, basePrice: 650, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#4',
			customerName: 'James Sutton',
			customerEmail: 'james@example.com',
			type: 'pickup',
			status: 'fulfilled',
			paymentStatus: 'paid',
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
			orderNumber: '#5',
			customerName: 'Riley Park',
			customerEmail: 'riley@example.com',
			type: 'pickup',
			status: 'pending_approval',
			paymentStatus: 'pending',
			pickupType: 'custom_date',
			subtotal: 35000,
			tax: 2888,
			total: 37888,
			scheduledFor: new Date('2026-09-15T12:00:00Z'),
			stripeCustomerId: 'cus_demo_riley',
			stripeSetupIntentId: 'seti_demo_riley',
			notes:
				'Three-tier cake — vanilla, lemon, and chocolate. Garden party theme, blush and sage colors.',
			items: [{ name: 'Custom Wedding Cake', quantity: 1, basePrice: 35000, selectedModifiers: [] }]
		},
		{
			orderNumber: '#6',
			customerName: 'Avery Chen',
			customerEmail: 'avery@example.com',
			type: 'pickup',
			status: 'payment_failed',
			paymentStatus: 'failed',
			pickupType: 'custom_date',
			subtotal: 8500,
			tax: 701,
			total: 9201,
			scheduledFor: new Date('2026-07-20T12:00:00Z'),
			stripeCustomerId: 'cus_demo_avery',
			stripePaymentIntentId: 'pi_demo_avery',
			notes: 'Chocolate cake, rainbow sprinkles, "Happy 10th Birthday Sofia!" in blue frosting.',
			items: [{ name: 'Custom Birthday Cake', quantity: 1, basePrice: 8500, selectedModifiers: [] }]
		}
	],

	orderCounter: 6
};
