import type { ArchetypeFixture } from '../types';

// taxRate: 0.0825. Tax = floor(subtotal × 0.0825).
// Order #1: 1200 + 450×2 = 2100. floor(2100×0.0825)=173. total=2273.
// Order #2: 350 + 550 = 900. floor(900×0.0825)=74. total=974.
// Order #3: 6500 (custom_date pending_approval). floor(6500×0.0825)=536. total=7036.
export const storefrontBakery: ArchetypeFixture = {
	key: 'storefront-bakery',
	label: 'Storefront bakery',
	description:
		'Brick-and-mortar bakery open daily for walk-in and online ordering. Customers order ahead and pick up at the counter during operating hours. Most useful with the Loyalty Program addon to reward regulars.',
	fulfillmentModel: 'storefront',
	allowedFulfillmentModels: ['storefront', 'hybrid'],
	vendorType: 'bakery',

	categories: [
		{ name: 'Breads', key: 'breads', sortOrder: 1 },
		{ name: 'Pastries', key: 'pastries', sortOrder: 2 },
		{ name: 'Coffee & Drinks', key: 'coffee', sortOrder: 3 },
		{ name: 'Custom Orders', key: 'customOrders', sortOrder: 4 }
	],

	items: [
		{
			categoryKey: 'breads',
			name: 'Sourdough Loaf',
			description: 'Country-style sourdough baked each morning. Crackling crust, open crumb.',
			price: 1200,
			sortOrder: 1
		},
		{
			categoryKey: 'breads',
			name: 'Country White',
			description: 'Soft, mild white sandwich loaf. Great for toast or sandwiches.',
			price: 900,
			sortOrder: 2
		},
		{
			categoryKey: 'pastries',
			name: 'Almond Croissant',
			description: 'Laminated pastry filled with almond frangipane and toasted almonds.',
			price: 450,
			sortOrder: 1
		},
		{
			categoryKey: 'pastries',
			name: 'Morning Bun',
			description: 'Flaky, orange-zested morning bun rolled in cinnamon sugar.',
			price: 350,
			sortOrder: 2
		},
		{
			categoryKey: 'coffee',
			name: 'Drip Coffee',
			description: 'House blend drip coffee. Available in 12 oz or 16 oz.',
			price: 300,
			sortOrder: 1
		},
		{
			categoryKey: 'coffee',
			name: 'Latte',
			description: 'Double espresso with steamed whole milk. Can substitute oat or almond milk.',
			price: 550,
			sortOrder: 2
		},
		{
			categoryKey: 'customOrders',
			name: 'Custom Birthday Cake',
			description:
				'Personalized birthday cake — your flavor, your design. Order at least 3 days ahead.',
			price: 6500,
			sortOrder: 1,
			pickupType: 'custom_date',
			customDateLeadDays: 3
		}
	],

	modifiers: [],

	locations: [
		{
			name: 'Storefront',
			address: { street: '14 Oak Street', city: 'Asheville', state: 'NC', zip: '28801' },
			notes:
				"Enter through the front on Oak Street. Pickup at the counter — give your name and we'll grab your order.",
			sortOrder: 0,
			isActive: true
		}
	],

	templates: [],

	hours: [
		{ dayOfWeek: 'tuesday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'wednesday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'thursday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'friday', openTime: '07:00', closeTime: '18:00' },
		{ dayOfWeek: 'saturday', openTime: '08:00', closeTime: '15:00' },
		{ dayOfWeek: 'sunday', openTime: '09:00', closeTime: '14:00' }
	],
	hoursExceptions: [{ date: '2026-11-26', isClosed: true, note: 'Closed for Thanksgiving' }],

	branding: {
		tagline: 'Baked fresh, every morning',
		logoUrl: '/seed-assets/logo.svg',
		bannerUrl: '/seed-assets/banner.svg',
		faviconUrl: '/seed-assets/favicon.svg',
		backgroundImageUrl: '/seed-assets/background.svg',
		backgroundColor: '#2c1810',
		accentColor: '#d4956a',
		foregroundColor: '#fdf4ec'
	},

	settings: {
		currency: 'USD',
		taxRate: 0.0825,
		enableTips: true,
		defaultTipPercentages: [15, 18, 20],
		allowPickup: true,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 10,
		asapPickupEnabled: true,
		loyalty: {
			enabled: false,
			type: 'stamps',
			stamps: { stampsPerOrder: 1, rewardAt: 8, rewardDescription: 'Free pastry of your choice' },
			points: { pointsPerDollar: 1, redeemAt: 100, redeemValue: 500 }
		}
	},

	promoCodes: [
		{
			code: 'FIRSTBITE',
			description: '10% off your first order',
			type: 'percent',
			amount: 10,
			minOrderAmount: 0,
			maxUses: null,
			expiresAt: null,
			isActive: true
		}
	],

	invitations: [{ email: 'riley@millstreetbakery-demo.com', role: 'staff', expiresInDays: 14 }],

	orders: [
		{
			orderNumber: '#1',
			customerName: 'Simone Laurent',
			customerEmail: 'simone@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			pickupMode: 'storefront_hours',
			subtotal: 2100,
			tax: 173,
			total: 2273,
			items: [
				{ name: 'Sourdough Loaf', quantity: 1, basePrice: 1200, selectedModifiers: [] },
				{ name: 'Almond Croissant', quantity: 2, basePrice: 450, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#2',
			customerName: 'Owen Daly',
			customerEmail: 'owen@example.com',
			type: 'pickup',
			status: 'preparing',
			paymentStatus: 'paid',
			pickupMode: 'storefront_hours',
			subtotal: 900,
			tax: 74,
			total: 974,
			items: [
				{ name: 'Morning Bun', quantity: 1, basePrice: 350, selectedModifiers: [] },
				{ name: 'Latte', quantity: 1, basePrice: 550, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#3',
			customerName: 'Keiko Tanaka',
			customerEmail: 'keiko@example.com',
			type: 'pickup',
			status: 'pending_approval',
			paymentStatus: 'pending',
			pickupType: 'custom_date',
			pickupMode: 'custom_date',
			subtotal: 6500,
			tax: 536,
			total: 7036,
			scheduledFor: new Date('2026-08-10T12:00:00Z'),
			stripeCustomerId: 'cus_demo_keiko',
			stripeSetupIntentId: 'seti_demo_keiko',
			notes: 'Chocolate cake with vanilla buttercream. "Happy Birthday Mei!" in pink. Serves 12.',
			items: [{ name: 'Custom Birthday Cake', quantity: 1, basePrice: 6500, selectedModifiers: [] }]
		}
	],

	orderCounter: 3
};
