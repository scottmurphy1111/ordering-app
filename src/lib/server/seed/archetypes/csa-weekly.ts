import type { ArchetypeFixture } from '../types';

// Tax: 0 — CSAs often qualify for agricultural food exemptions.
// All order totals equal their subtotals.
export const csaWeekly: ArchetypeFixture = {
	key: 'csa-weekly',
	label: 'CSA weekly pickup',
	description:
		'Farm selling weekly produce shares at a recurring Saturday pickup. No walk-in traffic — all orders placed ahead.',
	fulfillmentModel: 'pickup_only',
	allowedFulfillmentModels: ['pickup_only', 'hybrid'],
	vendorType: 'farm',

	categories: [
		{ name: 'Weekly Shares', key: 'weekly', sortOrder: 1 },
		{ name: 'Add-ons', key: 'addons', sortOrder: 2 }
	],

	items: [
		{
			categoryKey: 'weekly',
			name: 'Full Share Box',
			description:
				'Full seasonal produce box — 12 or more items including a mix of vegetables, greens, and herbs. Feeds 3–4 people for the week.',
			price: 2800,
			sortOrder: 1,
			availabilityMode: 'events_only'
		},
		{
			categoryKey: 'weekly',
			name: 'Half Share Box',
			description: 'Half share — 6–8 seasonal items. Great for 1–2 people or those new to CSA.',
			price: 1600,
			sortOrder: 2,
			availabilityMode: 'events_only'
		},
		{
			categoryKey: 'weekly',
			name: 'Fruit Share Add-on',
			description:
				'Seasonal stone fruit and berries from partner orchards. Availability varies by week.',
			price: 1200,
			sortOrder: 3,
			availabilityMode: 'events_only'
		},
		{
			categoryKey: 'addons',
			name: 'Dozen Farm Eggs',
			description:
				'Pasture-raised eggs from our own flock. Brown and blue shells; yolks are deep orange.',
			price: 750,
			sortOrder: 1,
			availabilityMode: 'events_only'
		},
		{
			categoryKey: 'addons',
			name: 'Raw Wildflower Honey',
			description: '8 oz jar of unfiltered wildflower honey. Harvested from on-farm hives.',
			price: 1400,
			sortOrder: 2,
			availabilityMode: 'events_only'
		}
	],

	modifiers: [],

	locations: [
		{
			name: 'River Valley Farm Stand',
			address: { street: '4521 Farm Road', city: 'Hillsborough', state: 'NC', zip: '27278' },
			notes:
				'Follow the blue signs to the farm stand. Bring your own bags — we use minimal packaging. Shares are in labeled boxes near the table. If your name is missing, ask a volunteer.',
			sortOrder: 0,
			isActive: true
		}
	],

	templates: [
		{
			name: 'Saturday CSA Pickup',
			recurrence: 'FREQ=WEEKLY;BYDAY=SA',
			windowStart: '09:00:00',
			windowEnd: '12:00:00',
			isActive: true,
			exdates: ['2026-12-27'],
			locationName: 'River Valley Farm Stand'
		}
	],

	hours: [],
	hoursExceptions: [],

	branding: {
		tagline: 'Grown with care, picked with purpose',
		logoUrl: '/seed-assets/logo-csa.svg',
		heroImageUrl: '/seed-assets/hero-placeholder.webp',
		faviconUrl: '/seed-assets/favicon.svg',
		backgroundColor: '#1a3a1e',
		accentColor: '#7ab648',
		foregroundColor: '#eef5e8',
		fontPair: 'lora-nunito-sans',
		headerMode: 'logo',
		heroDisplayMode: 'headline_tagline',
		heroHeadline: 'Welcome to Cedarwood Farm'
	},

	settings: {
		currency: 'USD',
		taxRate: 0.0,
		enableTips: false,
		defaultTipPercentages: [15, 18, 20],
		allowPickup: true,
		minimumOrderAmount: 0,
		estimatedPrepTimeMinutes: 0,
		asapPickupEnabled: false,
		loyalty: {
			enabled: false,
			type: 'stamps',
			stamps: {
				stampsPerOrder: 1,
				rewardAt: 10,
				rewardDescription: 'Free add-on item of your choice'
			},
			points: { pointsPerDollar: 1, redeemAt: 100, redeemValue: 500 }
		}
	},

	promoCodes: [
		{
			code: 'FRESHSEASON',
			description: '10% off your first share box',
			type: 'percent',
			amount: 10,
			minOrderAmount: 0,
			maxUses: null,
			expiresAt: null,
			isActive: true
		},
		{
			code: 'BULKBOX',
			description: '$5 off orders over $50',
			type: 'fixed',
			amount: 500,
			minOrderAmount: 5000,
			maxUses: 200,
			expiresAt: new Date('2026-12-31T23:59:59Z'),
			isActive: true
		}
	],

	invitations: [{ email: 'sam@greenrootcsa-demo.com', role: 'staff', expiresInDays: 14 }],

	// taxRate: 0 — all totals equal their subtotals.
	// Order #2: Half Share × 2 = 1600×2 = 3200.
	// Order #3: Full Share (2800) + Dozen Eggs (750) = 3550.
	// Order #4: Half Share (1600) + Raw Honey (1400) = 3000.
	// Order #5: Full Share (2800) + Fruit Add-on (1200) = 4000.
	orders: [
		{
			orderNumber: '#1',
			customerName: 'Priya Nair',
			customerEmail: 'priya@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			subtotal: 2800,
			tax: 0,
			total: 2800,
			items: [{ name: 'Full Share Box', quantity: 1, basePrice: 2800, selectedModifiers: [] }]
		},
		{
			orderNumber: '#2',
			customerName: 'Deon Wallace',
			customerEmail: 'deon@example.com',
			type: 'pickup',
			status: 'preparing',
			paymentStatus: 'paid',
			subtotal: 3200,
			tax: 0,
			total: 3200,
			items: [{ name: 'Half Share Box', quantity: 2, basePrice: 1600, selectedModifiers: [] }]
		},
		{
			orderNumber: '#3',
			customerName: 'Lena Kowalski',
			customerEmail: 'lena@example.com',
			type: 'pickup',
			status: 'fulfilled',
			paymentStatus: 'paid',
			subtotal: 3550,
			tax: 0,
			total: 3550,
			items: [
				{ name: 'Full Share Box', quantity: 1, basePrice: 2800, selectedModifiers: [] },
				{ name: 'Dozen Farm Eggs', quantity: 1, basePrice: 750, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#4',
			customerName: 'Marcus Bell',
			customerEmail: 'marcus@example.com',
			type: 'pickup',
			status: 'fulfilled',
			paymentStatus: 'paid',
			subtotal: 3000,
			tax: 0,
			total: 3000,
			items: [
				{ name: 'Half Share Box', quantity: 1, basePrice: 1600, selectedModifiers: [] },
				{ name: 'Raw Wildflower Honey', quantity: 1, basePrice: 1400, selectedModifiers: [] }
			]
		},
		{
			orderNumber: '#5',
			customerName: 'Tanya Osei',
			customerEmail: 'tanya@example.com',
			type: 'pickup',
			status: 'received',
			paymentStatus: 'paid',
			subtotal: 4000,
			tax: 0,
			total: 4000,
			items: [
				{ name: 'Full Share Box', quantity: 1, basePrice: 2800, selectedModifiers: [] },
				{ name: 'Fruit Share Add-on', quantity: 1, basePrice: 1200, selectedModifiers: [] }
			]
		}
	],

	orderCounter: 5
};
