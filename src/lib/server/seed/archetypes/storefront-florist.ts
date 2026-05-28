import type { ArchetypeFixture } from '../types';

// taxRate: 0.07. Tax = floor(subtotal × 0.07).
// Order #1: 3500. floor(3500×0.07)=245. total=3745.
// Order #2: 6500. floor(6500×0.07)=455. total=6955.
// Order #3: 18000 (custom_date pending_approval). floor(18000×0.07)=1260. total=19260.
export const storefrontFlorist: ArchetypeFixture = {
	key: 'storefront-florist',
	label: 'Storefront florist',
	description:
		'Retail florist open for walk-in and online order-ahead pickup. Customers browse and order same-day or schedule ahead for custom arrangements. Promo Codes and Loyalty Program addons fit this pattern well for holidays and repeat customers.',
	fulfillmentModel: 'storefront',
	allowedFulfillmentModels: ['storefront', 'hybrid'],
	vendorType: 'florist',

	categories: [
		{ name: 'Bouquets', key: 'bouquets', sortOrder: 1 },
		{ name: 'Arrangements', key: 'arrangements', sortOrder: 2 },
		{ name: 'Custom Orders', key: 'customOrders', sortOrder: 3 }
	],

	items: [
		{
			categoryKey: 'bouquets',
			name: 'Seasonal Bouquet',
			description:
				"Hand-tied mixed seasonal blooms. Changes weekly based on what's freshest. Wrapped and ready in 30 minutes.",
			price: 3500,
			sortOrder: 1
		},
		{
			categoryKey: 'bouquets',
			name: 'Sunflower Bunch',
			description: 'Six sunflowers with eucalyptus and seasonal greenery. Bright and cheerful.',
			price: 2500,
			sortOrder: 2
		},
		{
			categoryKey: 'arrangements',
			name: 'Garden Arrangement',
			description:
				'Lush mixed-flower arrangement in a glass vase. Perfect for a table centerpiece.',
			price: 6500,
			sortOrder: 1
		},
		{
			categoryKey: 'arrangements',
			name: 'Bud Vase Trio',
			description:
				'Three small bud vases, each with a single stem. Charming on a shelf or windowsill.',
			price: 4500,
			sortOrder: 2
		},
		{
			categoryKey: 'customOrders',
			name: 'Wedding Arrangement',
			description:
				'Custom bridal bouquet, centerpieces, or ceremony flowers. Consultation required. Order at least 2 weeks ahead.',
			price: 18000,
			sortOrder: 1,
			pickupType: 'custom_date',
			customDateLeadDays: 14
		}
	],

	modifiers: [],

	locations: [
		{
			name: 'Storefront',
			address: { street: '82 Garden Lane', city: 'Chapel Hill', state: 'NC', zip: '27514' },
			notes:
				"Ring the bell at the front counter. Arrangements are wrapped and labeled — give your name and we'll have it ready.",
			sortOrder: 0,
			isActive: true
		}
	],

	templates: [],

	hours: [
		{ dayOfWeek: 'monday', openTime: '09:00', closeTime: '18:00' },
		{ dayOfWeek: 'tuesday', openTime: '09:00', closeTime: '18:00' },
		{ dayOfWeek: 'wednesday', openTime: '09:00', closeTime: '18:00' },
		{ dayOfWeek: 'thursday', openTime: '09:00', closeTime: '18:00' },
		{ dayOfWeek: 'friday', openTime: '09:00', closeTime: '19:00' },
		{ dayOfWeek: 'saturday', openTime: '09:00', closeTime: '17:00' }
	],
	hoursExceptions: [],

	branding: {
		tagline: 'Fresh flowers, every day',
		logoUrl: '/seed-assets/logo-florist.svg',
		heroImageUrl: '/seed-assets/hero-placeholder.webp',
		faviconUrl: '/seed-assets/favicon.svg',
		backgroundColor: '#1b2e22',
		accentColor: '#8db87c',
		foregroundColor: '#edf5ec',
		fontPair: 'libre-baskerville-source-sans',
		headerMode: 'logo',
		heroDisplayMode: 'headline_tagline',
		heroHeadline: 'Welcome to Wildbloom Florals'
	},

	settings: {
		currency: 'USD',
		taxRate: 0.07,
		enableTips: false,
		defaultTipPercentages: [15, 18, 20],
		allowPickup: true,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 30,
		asapPickupEnabled: true,
		loyalty: {
			enabled: false,
			type: 'stamps',
			stamps: { stampsPerOrder: 1, rewardAt: 10, rewardDescription: 'Free seasonal bouquet' },
			points: { pointsPerDollar: 1, redeemAt: 100, redeemValue: 500 }
		}
	},

	promoCodes: [
		{
			code: 'BLOOM15',
			description: '15% off your first arrangement',
			type: 'percent',
			amount: 15,
			minOrderAmount: 0,
			maxUses: null,
			expiresAt: null,
			isActive: true
		}
	],

	invitations: [{ email: 'drew@bloomandco-demo.com', role: 'staff', expiresInDays: 14 }],

	orders: [
		{
			orderNumber: '#1',
			customerName: 'Priya Mehta',
			customerEmail: 'priya.m@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			pickupMode: 'storefront_hours',
			subtotal: 3500,
			tax: 245,
			total: 3745,
			items: [{ name: 'Seasonal Bouquet', quantity: 1, basePrice: 3500, selectedModifiers: [] }]
		},
		{
			orderNumber: '#2',
			customerName: 'Eliot Ward',
			customerEmail: 'eliot@example.com',
			type: 'pickup',
			status: 'ready',
			paymentStatus: 'paid',
			pickupMode: 'storefront_hours',
			subtotal: 6500,
			tax: 455,
			total: 6955,
			items: [{ name: 'Garden Arrangement', quantity: 1, basePrice: 6500, selectedModifiers: [] }]
		},
		{
			orderNumber: '#3',
			customerName: 'Clara Jensen',
			customerEmail: 'clara@example.com',
			type: 'pickup',
			status: 'pending_approval',
			paymentStatus: 'pending',
			pickupType: 'custom_date',
			pickupMode: 'custom_date',
			subtotal: 18000,
			tax: 1260,
			total: 19260,
			scheduledFor: new Date('2026-09-06T12:00:00Z'),
			stripeCustomerId: 'cus_demo_clara',
			stripeSetupIntentId: 'seti_demo_clara',
			notes: 'Garden wedding, blush and ivory palette. Bridal bouquet + 6 centerpieces.',
			items: [{ name: 'Wedding Arrangement', quantity: 1, basePrice: 18000, selectedModifiers: [] }]
		}
	],

	orderCounter: 3
};
