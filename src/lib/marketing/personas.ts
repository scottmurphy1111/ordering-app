export type PersonaTile = {
	icon: string;
	title: string;
	desc: string;
};

export type PersonaStep = {
	num: string;
	title: string;
	desc: string;
};

export type PersonaFeature = {
	icon: string;
	title: string;
	desc: string;
};

export type PersonaFaq = {
	q: string;
	a: string;
};

import type { TierKey } from '$lib/billing';

export type Persona = {
	slug: string;
	label: string;
	trackPage: string;

	metaTitle: string;
	metaDescription: string;

	eyebrow: string;
	heroHeadline: string;
	heroSubhead: string;
	heroImage: {
		src: string;
		alt: string;
	};
	heroPrimaryCtaLabel: string;
	heroSecondaryCtaLabel: string;

	valueTiles: PersonaTile[];
	steps: PersonaStep[];
	howItWorksHeadline: string;
	features: PersonaFeature[];
	featuresHeadline: string;
	pricing: {
		headline: string;
		subhead: string;
		/** Optional per-tier marketing tagline, keyed by canonical tier key. */
		taglinesByTier?: Partial<Record<TierKey, string>>;
	};
	faqHeadline: string;
	faqs: PersonaFaq[];
	closingHeadline: string;
	closingSubhead: string;
	closingCtaLabel: string;
	closingImage: string;
};

export const bakersPersona: Persona = {
	slug: 'bakers',
	label: 'Bakers',
	trackPage: 'for-bakers',

	metaTitle: 'Online Ordering for Bakers — Pre-Orders, Pickup, and Custom Cakes | Order Local, LLC',
	metaDescription:
		'Take bakery pre-orders online. Set holiday windows, custom modifiers, pickup cutoffs, and order limits per window. Powered by Stripe. No commissions. Free to start.',

	eyebrow: 'Built for bakers',
	heroHeadline: 'Stop taking cake orders by text.',
	heroSubhead:
		'Order Local gives your bakery a branded pre-order page — with pickup windows, holiday cutoffs, custom modifiers, and Stripe payments built in. Set it up once, and let it take orders while you bake.',
	heroImage: {
		src: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&h=900&fit=crop&q=80',
		alt: 'Freshly baked artisan bread loaves cooling on a rack'
	},
	heroPrimaryCtaLabel: 'Start for free',
	heroSecondaryCtaLabel: 'See how it works',

	valueTiles: [
		{
			icon: 'mdi:calendar-star',
			title: 'Holiday pre-orders, handled',
			desc: 'Open your Thanksgiving pie window in October. Set a cutoff date, cap the total orders, and let customers reserve theirs — without a single text message from you.'
		},
		{
			icon: 'mdi:format-list-checks',
			title: 'Special requests, built right in',
			desc: 'Modifiers for size, flavor, filling, and inscription. Customers configure exactly what they want at checkout, and you see every detail when you pull the order.'
		},
		{
			icon: 'mdi:clock-time-four-outline',
			title: 'Pickup windows that fit your schedule',
			desc: "Friday afternoons. Saturday market. Holiday-only slots. Set when you're open, close the window when you're full, and never over-promise again."
		}
	],

	howItWorksHeadline: 'Up and running before your next holiday rush.',
	steps: [
		{
			num: '1',
			title: 'Set up your catalog',
			desc: 'Add your products, photos, prices, and modifier options — sizes, flavors, fillings. Set up pickup windows with order caps so you never overbook a Saturday.'
		},
		{
			num: '2',
			title: 'Share your link',
			desc: 'Drop the link in your Instagram bio, email newsletter, or print a QR code for your counter. Customers order from any phone.'
		},
		{
			num: '3',
			title: 'Pull your list each morning',
			desc: 'Open the dashboard, see every order for the day in one view, and mark them ready as you go. No spreadsheet, no sticky notes.'
		}
	],

	featuresHeadline: "Everything bakers need. Nothing they don't.",
	features: [
		{
			icon: 'mdi:calendar-clock-outline',
			title: 'Holiday pre-order mode',
			desc: "Set a pickup date range, an order cutoff, and a hard cap on total orders. Run your Thanksgiving, Christmas, Valentine's Day, and Mother's Day windows without lifting a finger once it's live."
		},
		{
			icon: 'mdi:tune-variant',
			title: 'Modifiers, sizes, and options',
			desc: '6-inch or 9-inch. Chocolate or vanilla. Add "Happy Birthday." Pricing adjusts automatically — no more back-and-forth texts to clarify the order.'
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered checkout',
			desc: "Customers pay in full when they order. Funds go directly to your bank on Stripe's normal schedule. No commission, no per-order cut — just standard Stripe processing."
		},
		{
			icon: 'mdi:view-dashboard-outline',
			title: 'One-handed dashboard',
			desc: "Built for how bakeries actually run. See your orders, mark them ready, and manage the day from your phone — even when there's flour on your hands."
		}
	],

	pricing: {
		headline: 'Simple pricing. No commissions.',
		subhead: "Keep 100% of your sales. Pay only Stripe's standard processing fee.",
		taglinesByTier: {
			market: 'For growing bakeries taking regular pre-orders.',
			pro: 'For established bakeries running multiple windows.'
		}
	},

	faqHeadline: 'Questions from bakery owners',
	faqs: [
		{
			q: 'Can I use this just for holiday pre-orders and not year-round?',
			a: 'Yes. Many bakeries use Order Local seasonally — open their Thanksgiving window in October, run it through the holiday, then pause until the next season. You can pause Market and Pro plans any time.'
		},
		{
			q: 'How do customers specify custom details like inscription or flavor?',
			a: 'Through modifiers. You set up the options (flavor, size, filling, inscription text) and customers fill them in during checkout. Every detail shows up on the order — no follow-up needed.'
		},
		{
			q: 'How do I keep customers from ordering more than I can bake?',
			a: 'Set a hard cap on total orders for a pickup window. Once that number is hit, the window closes and no more orders come through. No awkward calls to customers who ordered after you were full.'
		},
		{
			q: 'Do customers pay upfront for custom cakes?',
			a: "Yes. Customers pay in full at checkout through Stripe. Funds land in your bank on Stripe's normal schedule — typically 2 business days. You never have to chase payment."
		},
		{
			q: 'I already have a website. Does Order Local replace it?',
			a: "No — it's an ordering page that sits alongside your existing site. Most bakeries link to it from their website, Instagram bio, and Google Business Profile."
		},
		{
			q: 'What plan do I need for pickup windows and cutoff times?',
			a: 'Pickup windows, cutoff times, and multiple pickup locations are available on every plan, including the free Starter plan. Catalog limits (10 items on Starter, 30 on Market $49/mo, unlimited on Pro $99/mo) determine which plan fits your operation. Modifiers work on all plans too.'
		}
	],

	closingHeadline: 'Your next holiday rush, organized.',
	closingSubhead: 'Set up your pre-order page today. Free to start, no credit card required.',
	closingCtaLabel: 'Start for free',
	closingImage:
		'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1600&h=600&fit=crop&q=80'
};

export const makersPersona: Persona = {
	slug: 'makers',
	label: 'Makers',
	trackPage: 'for-makers',

	metaTitle: 'Online Ordering for Makers — Pre-Orders for Handmade Goods | Order Local',
	metaDescription:
		'Sell what you make on your terms. Pre-order windows, pickup scheduling, custom modifiers for variants, and Stripe checkout. No commissions. Free to start.',

	eyebrow: 'Built for makers',
	heroHeadline: 'Pre-orders for the things you make by hand.',
	heroSubhead:
		"Whether it's jam, candles, ceramics, or floral arrangements — Order Local gives you a branded pre-order page with pickup scheduling and Stripe checkout. Run small batches, fulfill orders without juggling DMs, and keep 100% of your sales.",
	heroImage: {
		src: 'https://images.unsplash.com/photo-1645871302770-fa6c882a8e2b?w=1200&h=900&fit=crop&q=80',
		alt: 'Jars of homemade honey lined up on a table'
	},
	heroPrimaryCtaLabel: 'Start for free',
	heroSecondaryCtaLabel: 'See how it works',

	valueTiles: [
		{
			icon: 'mdi:package-variant-closed',
			title: 'Small batches, sold out cleanly',
			desc: "Made 30 jars of preserves? Cap orders at 30. The item goes sold-out automatically and nobody buys what you can't deliver."
		},
		{
			icon: 'mdi:palette-swatch-outline',
			title: 'Variants without the chaos',
			desc: 'Scent options. Color choices. Sizes. Set up the variants once; customers pick what they want at checkout. No more "did you want lavender or rose?"'
		},
		{
			icon: 'mdi:calendar-arrow-right',
			title: 'Pickup on your schedule',
			desc: "Sundays at the studio. Wednesdays at the market. Custom windows for special drops. Set when you're available, customers book themselves in."
		}
	],

	howItWorksHeadline: 'Up and running by your next batch.',
	steps: [
		{
			num: '1',
			title: 'Set up your catalog',
			desc: 'Add your products, photos, prices, and variants — sizes, scents, colors. Set order caps on each pickup window so you only commit to what you can make.'
		},
		{
			num: '2',
			title: 'Share your link',
			desc: 'Drop the link in your Instagram bio, email list, or print a QR code for your booth. Customers order from any phone.'
		},
		{
			num: '3',
			title: 'Make and fulfill',
			desc: "Open the dashboard, see every order in one view, and mark them ready when they're packed. No more juggling DMs."
		}
	],

	featuresHeadline: "Everything makers need. Nothing they don't.",
	features: [
		{
			icon: 'mdi:layers-outline',
			title: 'Variants and modifiers',
			desc: 'Scents, colors, sizes, finishes — set them up once, customers configure their order at checkout. Pricing adjusts automatically.'
		},
		{
			icon: 'mdi:counter',
			title: 'Order caps per pickup window',
			desc: "Only made 12 candles for this Saturday's market? Cap the window at 12 orders. It closes when it fills up — you never overpromise. Open a new window for next week."
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered checkout',
			desc: 'Customers pay upfront. Funds go straight to your bank via Stripe. No commission, no per-order cut — just standard Stripe processing.'
		},
		{
			icon: 'mdi:view-dashboard-outline',
			title: 'A dashboard built for makers',
			desc: 'See your orders by pickup day, mark them ready as you pack, and run the whole thing from your phone. No spreadsheet, no chaos.'
		}
	],

	pricing: {
		headline: 'Simple pricing. No commissions.',
		subhead: "Keep 100% of your sales. Pay only Stripe's standard processing fee.",
		taglinesByTier: {
			market: 'For makers running regular drops or seasonal batches.',
			pro: 'For established makers selling across multiple channels.'
		}
	},

	faqHeadline: 'Questions from makers',
	faqs: [
		{
			q: 'Can I run seasonal drops only and pause between?',
			a: 'Yes. Many makers use Order Local for specific drops — a holiday candle release, a spring soap collection — then pause until the next one. You can pause Market and Pro plans any time.'
		},
		{
			q: 'How do I handle variants like scent, color, or size?',
			a: 'Through modifiers. You set up the options (scent, color, size, finish) and customers pick what they want during checkout. Every detail shows up on the order — no follow-up needed.'
		},
		{
			q: 'What if I only made a small batch and want to limit orders?',
			a: 'Cap the total orders on the pickup window for that batch. Once that number is hit, the window closes and no more orders come through. Open a fresh window for your next batch.'
		},
		{
			q: 'Do customers pay upfront?',
			a: "Yes. Customers pay in full at checkout through Stripe. Funds land in your bank on Stripe's normal schedule — typically 2 business days. You never have to chase payment."
		},
		{
			q: 'I already sell on Instagram. Why use this?',
			a: "Instagram DMs don't scale — you lose track of who paid, what they ordered, when they're picking up. Order Local replaces the DM chaos with a real ordering page while still letting you funnel from Instagram, Pinterest, or anywhere else."
		},
		{
			q: 'What plan do I need for variants and pickup windows?',
			a: 'Pickup windows, cutoff times, and variants/modifiers are available on every plan, including the free Starter plan. Catalog limits (10 items on Starter, 30 on Market $49/mo, unlimited on Pro $99/mo) determine which plan fits the size of your catalog.'
		}
	],

	closingHeadline: 'Your next drop, organized.',
	closingSubhead: 'Set up your pre-order page today. Free to start, no credit card required.',
	closingCtaLabel: 'Start for free',
	closingImage:
		'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&h=600&fit=crop&q=80'
};

export const growersPersona: Persona = {
	slug: 'growers',
	label: 'Growers',
	trackPage: 'for-growers',

	metaTitle: 'Online Ordering for Growers — Pre-Orders for Farm Stands & Markets | Order Local',
	metaDescription:
		'Take pre-orders for what you grow. Pickup windows for market days, CSA boxes, and farm stands. Stripe checkout. No commissions. Free to start.',

	eyebrow: 'Built for growers',
	heroHeadline: 'Pre-orders before the market opens.',
	heroSubhead:
		'Order Local gives growers a branded pre-order page — perfect for market days, CSA shares, and farm-stand pickups. Customers reserve what they want, you arrive knowing what to bring. Less waste, less hauling, more sold.',
	heroImage: {
		src: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=1200&h=900&fit=crop&q=80',
		alt: 'Freshly harvested vegetables from a small farm'
	},
	heroPrimaryCtaLabel: 'Start for free',
	heroSecondaryCtaLabel: 'See how it works',

	valueTiles: [
		{
			icon: 'mdi:tent',
			title: 'Sell out before you set up',
			desc: "Open pre-orders Thursday for Saturday market. Show up with exactly what's been ordered — plus your walk-up inventory. Less hauling home."
		},
		{
			icon: 'mdi:package-variant',
			title: 'CSA shares, simplified',
			desc: "Run weekly box shares without spreadsheets. Customers subscribe, you fulfill, the dashboard tracks who picked up and who didn't."
		},
		{
			icon: 'mdi:clock-time-four-outline',
			title: 'Pickup windows that match your week',
			desc: 'Tuesday CSA pickup. Saturday market booth. Wednesday farm stand. Different windows, different locations — all in one dashboard.'
		}
	],

	howItWorksHeadline: 'Up and running before your next market day.',
	steps: [
		{
			num: '1',
			title: 'Set up your catalog',
			desc: "Add your products, photos, prices, and what's in season this week. Set up pickup windows with order caps for market days or farm-stand hours."
		},
		{
			num: '2',
			title: 'Share your link',
			desc: 'Drop the link in your newsletter, Instagram bio, or a QR code at your booth. Customers reserve before market day.'
		},
		{
			num: '3',
			title: 'Show up ready',
			desc: "Pull the pickup list each morning. Pack exactly what's ordered, leave the rest in the field. No more loading up what doesn't sell."
		}
	],

	featuresHeadline: "Everything growers need. Nothing they don't.",
	features: [
		{
			icon: 'mdi:map-marker-multiple-outline',
			title: 'Multiple pickup locations',
			desc: 'Saturday at the downtown market. Wednesday at the farm stand. Tuesday CSA at the church parking lot. Customers pick where; you see one consolidated list per day.'
		},
		{
			icon: 'mdi:basket-outline',
			title: 'Cap each pickup window',
			desc: 'Only 20 orders worth of asparagus this Saturday? Cap the market window at 20. When it fills up, the window closes — no awkward "sold out before you got here" at the booth.'
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered checkout',
			desc: "Customers pay when they order — no fumbling with cash at the booth. Funds land in your bank on Stripe's normal schedule. No commission."
		},
		{
			icon: 'mdi:view-dashboard-outline',
			title: 'Run market day from your phone',
			desc: 'See pickups by location and time. Mark orders fulfilled as customers arrive. Built one-handed for the booth.'
		}
	],

	pricing: {
		headline: 'Simple pricing. No commissions.',
		subhead: "Keep 100% of your sales. Pay only Stripe's standard processing fee.",
		taglinesByTier: {
			market: 'For growers selling at one or two markets a week.',
			pro: 'For established growers across multiple markets and CSAs.'
		}
	},

	faqHeadline: 'Questions from growers and market vendors',
	faqs: [
		{
			q: 'Can customers order at the booth without going to the website?',
			a: "Yes. Print the QR code from your dashboard and put it at your booth. Customers scan, order on their phone, and pick up right there — same as if they'd ordered the night before."
		},
		{
			q: 'How do I handle weekly CSA shares?',
			a: "Set up your share as a recurring item with a weekly pickup window. Customers subscribe; the dashboard tracks who's active, who picked up, and who hasn't. Recurring subscriptions require the Subscriptions add-on (available on Market $49/mo and Pro $99/mo plans)."
		},
		{
			q: 'Multiple markets each week — does Order Local handle that?',
			a: 'Yes. Set up multiple pickup locations on any plan. Customers pick where they want to grab their order; you see one consolidated list per day, sorted by location.'
		},
		{
			q: 'What if the crop comes in short this week?',
			a: "Adjust the pickup window's order cap mid-week. The dashboard reflects the new limit immediately. Existing orders are unaffected; new orders see the lower cap."
		},
		{
			q: 'Do customers pay upfront?',
			a: "Yes. Customers pay in full at checkout through Stripe. Funds land in your bank on Stripe's normal schedule — typically 2 business days. No more cash management at the booth."
		},
		{
			q: 'What plan do I need for multiple markets or a CSA?',
			a: 'Multiple pickup locations come standard on every plan, including the free Starter plan. Recurring CSA shares require the Subscriptions add-on (available on Market $49/mo and Pro $99/mo). Pick the tier based on your catalog size — 10 items on Starter, 30 on Market, unlimited on Pro.'
		}
	],

	closingHeadline: 'Your next market day, organized.',
	closingSubhead: 'Set up your pre-order page today. Free to start, no credit card required.',
	closingCtaLabel: 'Start for free',
	closingImage:
		'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&h=600&fit=crop&q=80'
};
