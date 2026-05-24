<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { track } from '$lib/analytics';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';

	const loginHref = resolve('/login');

	const audiences = [
		{
			icon: 'mdi:bread-slice-outline',
			label: 'Bakers',
			path: '/for-bakers' as string | undefined
		},
		{
			icon: 'mdi:silverware-fork-knife',
			label: 'Makers',
			path: '/for-makers' as string | undefined
		},
		{
			icon: 'mdi:barley',
			label: 'Growers',
			path: '/for-growers' as string | undefined
		},
		{ icon: 'mdi:food-steak', label: 'Butchers', path: undefined },
		{ icon: 'mdi:flower-outline', label: 'Florists', path: undefined },
		{ icon: 'mdi:package-variant-closed', label: 'CSA boxes', path: undefined },
		{ icon: 'mdi:truck-outline', label: 'Food trucks', path: undefined },
		{ icon: 'mdi:coffee-outline', label: 'Coffee shops', path: undefined },
		{ icon: 'mdi:tent', label: 'Market vendors', path: undefined }
	];

	const storefrontFeatures = [
		{
			icon: 'mdi:storefront-outline',
			title: 'Sell online, in person, or both',
			desc: 'A storefront for pre-orders. A booth checkout for market days. Customers see one brand; you see one dashboard.'
		},
		{
			icon: 'mdi:palette-outline',
			title: 'Make it look like yours',
			desc: 'Choose your colors, fonts, banners, and background patterns. Your storefront feels like your business — not a templated landing page.'
		},
		{
			icon: 'mdi:image-auto-adjust',
			title: 'AI-generated product photos',
			desc: 'No professional photographer on payroll? Generate clean, consistent product shots in seconds. Tune until they match your style.'
		},
		{
			icon: 'mdi:qrcode',
			title: 'Reach customers everywhere',
			desc: 'QR codes for the booth. An embeddable button for your existing site. Wherever they find you, they can order.'
		}
	];

	const operationsFeatures = [
		{
			icon: 'mdi:calendar-clock-outline',
			title: 'Pickup windows that match your schedule',
			desc: 'Set the days, hours, and locations customers can pick up. Saturday at the market. Thursdays at the shop. A holiday-only window for Thanksgiving pies.'
		},
		{
			icon: 'mdi:clipboard-list-outline',
			title: 'Production planning',
			desc: 'See exactly what you need to produce each day, totaled across all open orders. No more spreadsheets to add up the sourdough count.'
		},
		{
			icon: 'mdi:bell-ring-outline',
			title: 'Real-time order management',
			desc: 'New orders appear instantly. Mark them ready and customers get notified. Works one-handed on your phone — built for the way you actually run the day.'
		},
		{
			icon: 'mdi:timer-off-outline',
			title: 'Order cutoffs and inventory limits',
			desc: '"Orders by Thursday 8pm for Saturday pickup." "Only 12 dozen available this week." Sell out cleanly instead of disappointing customers in person.'
		},
		{
			icon: 'mdi:file-document-edit-outline',
			title: 'Custom orders with quotes',
			desc: 'Let customers request something off-menu — a birthday cake, a holiday box. Send a quote, take a deposit, deliver on the date.'
		}
	];

	const growthFeatures = [
		{
			icon: 'mdi:tag-outline',
			title: 'Promo codes',
			desc: 'Run a Friday-only discount. Send a code to your newsletter list. Cap usage or expire automatically.'
		},
		{
			icon: 'mdi:chart-line',
			title: 'Analytics dashboard',
			desc: "Revenue trends, top items, peak hours. Know what's working without exporting CSVs."
		},
		{
			icon: 'mdi:cog-refresh-outline',
			title: 'Flexible billing',
			desc: 'Change plans anytime. Add a feature for the holidays, drop it after. No yearly contracts, no surprise renewals.'
		}
	];

	const steps = [
		{
			num: '1',
			title: 'Create your account',
			desc: 'Sign up in under a minute. No credit card to start.'
		},
		{
			num: '2',
			title: 'Connect Stripe',
			desc: 'Link your Stripe account so payments go straight to your bank. We never touch the money.'
		},
		{
			num: '3',
			title: 'Build your catalog',
			desc: 'Add products, photos, prices, and pickup windows. Set inventory limits and cutoff times.'
		},
		{
			num: '4',
			title: 'Share your link',
			desc: 'Print the QR code for your booth. Drop the link in your Instagram bio. Take your first pre-order.'
		}
	];

	const plans = [
		{
			name: 'Starter',
			tagline: 'Try it out, take your first orders.',
			monthlyPrice: null as number | null,
			annualYearlyPrice: null as number | null,
			annualSavings: null as string | null,
			features: [
				'Up to 10 catalog items',
				'Your own branded storefront link',
				'Online ordering & payments',
				'Order management',
				'Customer email receipts',
				'Catalog QR code',
				'Standard Stripe fees only (2.9% + 30¢)'
			],
			cta: 'Start for free',
			highlight: false
		},
		{
			name: 'Market',
			tagline: 'For booth vendors, market sellers, and side-hustle makers.',
			monthlyPrice: 29,
			annualYearlyPrice: 290,
			annualSavings: 'Save $58/yr',
			features: [
				'Everything in Starter',
				'Up to 30 catalog items',
				'Pickup windows & cutoff times',
				'Inventory limits per item',
				'Single pickup location',
				'Eligible for select add-ons',
				'Standard Stripe fees only'
			],
			cta: 'Start free trial',
			highlight: false
		},
		{
			name: 'Pro',
			tagline: 'The full toolkit for shops, bakeries, and growing businesses.',
			monthlyPrice: 79,
			annualYearlyPrice: 780,
			annualSavings: 'Save $168/yr',
			features: [
				'Everything in Market',
				'Unlimited catalog items',
				'Multiple pickup locations',
				'Website embed',
				'Priority support',
				'Eligible for all add-ons',
				'Standard Stripe fees only'
			],
			cta: 'Get started',
			highlight: true
		}
	];

	const addons = [
		{
			icon: 'mdi:message-text-outline',
			name: 'SMS Notifications',
			monthlyPrice: 19,
			annualMonthlyPrice: 16,
			price: '$19/mo',
			annualPrice: '$16/mo billed annually',
			annualSavings: 'save $36/yr',
			desc: 'Text customers the moment their order is ready — fewer missed pickups, happier guests.'
		},
		{
			icon: 'mdi:chart-line',
			name: 'Advanced Analytics',
			monthlyPrice: 19,
			annualMonthlyPrice: 16,
			price: '$19/mo',
			annualPrice: '$16/mo billed annually',
			annualSavings: 'save $36/yr',
			desc: 'Revenue trends, top items, peak hours, and customer insights in one dashboard.'
		},
		{
			icon: 'mdi:star-circle-outline',
			name: 'Loyalty Program',
			monthlyPrice: 29,
			annualMonthlyPrice: 24,
			price: '$29/mo',
			annualPrice: '$24/mo billed annually',
			annualSavings: 'save $60/yr',
			desc: 'Reward repeat customers with a stamp card or points system built into your ordering flow.'
		},
		{
			icon: 'mdi:refresh-circle',
			name: 'Subscriptions',
			monthlyPrice: 29,
			annualMonthlyPrice: 24,
			price: '$29/mo',
			annualPrice: '$24/mo billed annually',
			annualSavings: 'save $60/yr',
			desc: 'Sell meal plans, weekly boxes, or retainers — customers subscribe and are billed automatically.'
		}
	];

	const faqs = [
		{
			q: 'Does Order Local take a cut of my sales?',
			a: "No. We charge a flat monthly fee. Your customers pay through Stripe, and Stripe's standard processing fee (2.9% + 30¢) applies. We don't touch your money or take a percentage."
		},
		{
			q: 'I sell at a farmers market on Saturdays. Does this work for me?',
			a: 'Yes — this is exactly what we built it for. Set your pickup window for Saturday morning at the market, set an order cutoff for Thursday night, and customers can reserve their items in advance. Bring the printed orders to your booth.'
		},
		{
			q: 'My products change every week. Can I update the catalog easily?',
			a: 'Yes. Add, hide, or edit items in seconds from your dashboard. Set inventory limits per item so you stop selling once you hit your weekly cap.'
		},
		{
			q: 'Do my customers need to download an app?',
			a: 'No. Customers order from any phone or laptop browser. Share your link, your QR code, or embed the catalog on your website.'
		},
		{
			q: 'What happens when I hit 10 items on the Starter plan?',
			a: 'Upgrade to Market ($29/mo) for 30 items or Pro ($79/mo) for unlimited. Your existing catalog and orders carry over.'
		},
		{
			q: 'Can I pause my subscription in the off-season?',
			a: "Yes. Many of our customers run seasonal businesses. You can pause Market and Pro subscriptions and resume when you're ready."
		},
		{
			q: 'How do I get paid?',
			a: "Directly. Funds from every order go to your Stripe account and are deposited in your bank on Stripe's normal schedule (typically 2 business days)."
		},
		{
			q: 'Can I use my own branding?',
			a: 'Yes. Add your logo, colors, and product photos — your storefront gets its own branded link at yourshop.getorderlocal.com.'
		}
	];

	let estimatorChecked = $state<boolean[]>(addons.map(() => false));
	let estimatorPlan = $state<'Starter' | 'Market' | 'Pro'>('Pro');
	let pricingInterval = $state<'monthly' | 'annual'>('monthly');
	let openFaq = $state<string | undefined>(undefined);
	let mobileMenuOpen = $state(false);

	const estimatorBase = $derived(
		estimatorPlan === 'Starter'
			? 0
			: estimatorPlan === 'Market'
				? pricingInterval === 'annual'
					? 24
					: 29
				: pricingInterval === 'annual'
					? 66
					: 79
	);

	const estimatorTotal = $derived(
		addons.reduce(
			(sum, addon, i) =>
				sum +
				(estimatorChecked[i]
					? pricingInterval === 'annual'
						? addon.annualMonthlyPrice
						: addon.monthlyPrice
					: 0),
			0
		)
	);

	const faqJsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: faqs.map((f) => ({
			'@type': 'Question',
			name: f.q,
			acceptedAnswer: { '@type': 'Answer', text: f.a }
		}))
	});
</script>

<svelte:head>
	<title>Order Local — Pre-orders and pickup for makers, bakers, and growers</title>
	<meta
		name="description"
		content="Branded online ordering for local businesses. Take pre-orders, accept Stripe payments, and manage pickup — without commissions or apps. Free to start."
	/>
	<meta
		property="og:title"
		content="Order Local — Pre-orders and pickup for makers, bakers, and growers"
	/>
	<meta
		property="og:description"
		content="Branded online ordering for local businesses. Take pre-orders, accept Stripe payments, and manage pickup — without commissions or apps. Free to start."
	/>
	<meta property="og:image" content="/og-image.png" />
	<meta name="twitter:card" content="summary_large_image" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + faqJsonLd + '<' + '/script>'}
</svelte:head>

<!-- Nav -->
<header class="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a
			href={resolve('/')}
			class="text-xl font-bold tracking-tight text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
		>
			Order<span class="text-primary">Local</span>
		</a>
		<nav class="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
			<a
				href="#features"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Features</a
			>
			<a
				href="#how-it-works"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>How it works</a
			>
			<a
				href="#pricing"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Pricing</a
			>
			<a
				href="#faq"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>FAQ</a
			>
		</nav>
		<div class="flex items-center gap-3">
			<a
				href={loginHref}
				class="hidden text-sm font-medium text-zinc-700 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none sm:inline"
			>
				Sign in
			</a>
			<a
				href={loginHref}
				onclick={() => track('cta_click', { location: 'header' })}
				class="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none sm:inline-block"
			>
				Start for free
			</a>
			<button
				type="button"
				aria-label="Open navigation menu"
				aria-expanded={mobileMenuOpen}
				aria-controls="mobile-menu"
				onclick={() => (mobileMenuOpen = true)}
				class="rounded-md p-2 text-zinc-700 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none md:hidden"
			>
				<Icon icon="mdi:menu" class="h-5 w-5" />
			</button>
		</div>
	</div>
</header>

{#if mobileMenuOpen}
	<div
		id="mobile-menu"
		role="dialog"
		aria-modal="true"
		aria-label="Navigation menu"
		tabindex="-1"
		class="fixed inset-0 z-50 flex flex-col bg-white md:hidden"
		onkeydown={(e) => {
			if (e.key === 'Escape') mobileMenuOpen = false;
		}}
	>
		<div class="flex items-center justify-between border-b px-6 py-4">
			<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
				Order<span class="text-primary">Local</span>
			</a>
			<button
				type="button"
				aria-label="Close navigation menu"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-md p-2 text-zinc-700 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
			>
				<Icon icon="mdi:close" class="h-5 w-5" />
			</button>
		</div>
		<nav class="flex flex-col gap-1 px-4 py-6 text-base font-medium">
			<a
				href="#features"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Features</a
			>
			<a
				href="#how-it-works"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>How it works</a
			>
			<a
				href="#pricing"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Pricing</a
			>
			<a
				href="#faq"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>FAQ</a
			>
		</nav>
		<div class="mt-auto flex flex-col gap-3 border-t px-4 py-6">
			<a
				href={loginHref}
				class="rounded-lg px-4 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Sign in</a
			>
			<a
				href={loginHref}
				class="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Start for free</a
			>
		</div>
	</div>
{/if}

<!-- Hero -->
<section
	class="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background px-6 pt-24 pb-16"
>
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(22,163,74,0.08),transparent)]"
	></div>
	<div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
		<!-- Text -->
		<div class="flex flex-col items-center text-center">
			<span
				class="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Built for makers, bakers, and growers
			</span>
			<h1
				class="w-full max-w-[20ch] text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl"
			>
				Pre-orders and pickup, done right.
			</h1>
			<p class="mt-6 w-full max-w-lg text-lg leading-relaxed text-muted-foreground">
				Order Local gives you a branded ordering page so customers can reserve, pay, and pick up —
				at your booth, your shop, or by appointment. Powered by Stripe, set up in minutes, no app
				required.
			</p>
			<div class="mt-10 flex flex-col items-center gap-3 sm:flex-row">
				<a
					href={loginHref}
					onclick={() => track('cta_click', { location: 'hero' })}
					class="w-full rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary/90 sm:w-auto"
				>
					Start for free
				</a>
				<a
					href="#how-it-works"
					class="w-full rounded-xl border bg-background px-8 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted/50 sm:w-auto"
				>
					See how it works
				</a>
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				No credit card to start · Free plan available · Keep 100% of your sales
			</p>
		</div>

		<!-- Dashboard mock -->
		<div class="relative mx-auto w-full max-w-lg pr-2 pb-10">
			<div
				class="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-primary/5 blur-2xl"
			></div>
			<div class="overflow-hidden rounded-2xl border bg-background shadow-2xl">
				<!-- Browser chrome -->
				<div class="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2.5">
					<div class="h-2.5 w-2.5 rounded-full bg-red-400/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-yellow-400/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-green-400/70"></div>
					<div
						class="ml-2 flex-1 rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground/70"
					>
						myshop.getorderlocal.com/dashboard
					</div>
				</div>
				<!-- Dashboard layout -->
				<div class="flex">
					<!-- Sidebar -->
					<div class="flex w-28 shrink-0 flex-col bg-gray-900 px-2 py-3">
						<p class="mb-3 px-2 text-[10px] font-bold text-white">
							Order<span class="text-primary">Local</span>
						</p>
						<div class="space-y-0.5">
							<div class="rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-white">
								Overview
							</div>
							<div class="px-2 py-1.5 text-[10px] text-gray-400">Orders</div>
							<div class="px-2 py-1.5 text-[10px] text-gray-400">Catalog</div>
							<div class="px-2 py-1.5 text-[10px] text-gray-400">Analytics</div>
							<div class="px-2 py-1.5 text-[10px] text-gray-400">Settings</div>
						</div>
					</div>
					<!-- Main content -->
					<div class="flex-1 bg-muted/30 p-4">
						<div class="mb-3 flex items-center justify-between">
							<p class="text-xs font-semibold text-foreground">Overview</p>
							<span
								class="rounded-md border border-primary px-2 py-0.5 text-[10px] font-semibold text-primary"
								>Open live catalog ↗</span
							>
						</div>
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each [{ label: 'Revenue (30d)', value: '$4,280', change: '+12.4%' }, { label: 'Orders', value: '63', change: '+8.2%' }, { label: 'Avg Order', value: '$67.90', change: '+3.1%' }] as kpi (kpi.label)}
								<div class="rounded-lg border bg-background p-2 shadow-sm">
									<p class="text-[8px] font-medium text-muted-foreground uppercase">{kpi.label}</p>
									<p class="mt-0.5 text-sm font-bold text-foreground">{kpi.value}</p>
									<p class="text-[9px] font-medium text-primary">{kpi.change}</p>
								</div>
							{/each}
						</div>
						<div class="rounded-lg border bg-background p-2.5 shadow-sm">
							<p class="mb-2 text-[10px] font-semibold text-foreground">Recent orders</p>
							<div class="space-y-1.5">
								{#each [{ num: '#142', items: 'Sourdough ×2, Honey', status: 'New', color: 'bg-blue-100 text-blue-700' }, { num: '#141', items: 'CSA Box — Large', status: 'Preparing', color: 'bg-yellow-100 text-yellow-700' }, { num: '#140', items: 'Rye loaf, Jam', status: 'Ready', color: 'bg-green-100 text-green-700' }] as order (order.num)}
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0">
											<span class="text-[9px] font-medium text-foreground">{order.num}</span>
											<span class="text-[9px] text-muted-foreground"> · {order.items}</span>
										</div>
										<span
											class="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold {order.color}"
											>{order.status}</span
										>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Floating customer catalog mock -->
			<div
				class="absolute right-0 -bottom-2 z-10 w-44 overflow-hidden rounded-2xl border bg-background shadow-2xl ring-1 ring-black/5"
			>
				<div class="bg-gray-900 px-3 py-2.5">
					<div class="flex items-center gap-2">
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-[9px] font-bold text-white"
						>
							OL
						</div>
						<div>
							<p class="text-[10px] font-bold text-white">Sunrise Bakery</p>
							<p class="text-[8px] text-gray-400">Pre-order · pickup Sat</p>
						</div>
					</div>
				</div>
				<div class="flex gap-1 border-b bg-muted/30 px-2 py-1.5">
					<span class="rounded-full bg-primary px-2 py-0.5 text-[7px] font-semibold text-white"
						>Breads</span
					>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground"
						>Pastries</span
					>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground"
						>Extras</span
					>
				</div>
				<div class="divide-y px-2">
					{#each [{ name: 'Sourdough Loaf', desc: 'Saturday pickup only', price: '$12.00', color: 'bg-amber-100' }, { name: 'Rye Loaf', desc: 'Pre-sliced available', price: '$11.00', color: 'bg-orange-100' }, { name: 'Croissant ×6', desc: 'Order by Thu 8pm', price: '$18.00', color: 'bg-yellow-100' }] as item (item.name)}
						<div class="flex items-center justify-between gap-2 py-2">
							<div class="flex items-center gap-1.5">
								<div class="h-8 w-8 shrink-0 rounded-lg {item.color}"></div>
								<div>
									<p class="text-[8px] font-semibold text-foreground">{item.name}</p>
									<p class="text-[7px] leading-tight text-muted-foreground">{item.desc}</p>
									<p class="mt-0.5 text-[8px] font-medium text-foreground">{item.price}</p>
								</div>
							</div>
							<button
								type="button"
								class="shrink-0 rounded-full bg-primary p-1"
								aria-label="Add {item.name}"
							>
								<Icon icon="mdi:plus" class="h-2.5 w-2.5 text-white" />
							</button>
						</div>
					{/each}
				</div>
				<div class="bg-primary px-3 py-2">
					<p class="text-center text-[8px] font-semibold text-white">
						View cart · 2 items · $23.00
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Audience strip -->
<div class="border-y bg-muted/40 py-6">
	<p class="mb-3 text-center text-xs font-semibold tracking-widest text-muted-foreground uppercase">
		Built for the people who sell what they make
	</p>
	<div class="flex flex-wrap justify-center gap-2 px-6">
		{#each audiences as a (a.label)}
			{#if a.path}
				<a
					href={resolve(a.path as '/for-bakers' | '/for-makers' | '/for-growers')}
					class="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>
					<Icon icon={a.icon} class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
					{a.label}
				</a>
			{:else}
				<span
					class="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground"
				>
					<Icon icon={a.icon} class="h-3.5 w-3.5 text-primary" aria-hidden="true" />
					{a.label}
				</span>
			{/if}
		{/each}
	</div>
</div>

<!-- Storefront features -->
<section id="features" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-12 overflow-hidden rounded-2xl">
			<img
				src="https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1600&h=400&fit=crop&q=80"
				alt="Vendor handing a paper bag to a customer at a farmers market booth"
				class="h-48 w-full object-cover sm:h-56 md:h-64 lg:h-72"
				loading="lazy"
			/>
		</div>
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Your storefront
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				A presence customers recognize, wherever they find you.
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each storefrontFeatures as f (f.title)}
				<div
					class="flex h-full flex-col rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<h3 class="font-semibold text-foreground">{f.title}</h3>
					<p class="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Operations features -->
<section class="scroll-mt-20 bg-emerald-50/40 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-12 overflow-hidden rounded-2xl">
			<img
				src="https://images.unsplash.com/photo-1698093121320-9df031f3e414?w=1600&h=400&fit=crop&q=80"
				alt="A baker kneading dough on a wooden table"
				class="h-48 w-full object-cover sm:h-56 md:h-64 lg:h-72"
				loading="lazy"
			/>
		</div>
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Day-to-day operations
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Run your day, not a spreadsheet.
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each operationsFeatures as f (f.title)}
				<div
					class="flex h-full flex-col rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<h3 class="font-semibold text-foreground">{f.title}</h3>
					<p class="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Growth features -->
<section class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Grow what's working
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Tools to grow as your business does.
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each growthFeatures as f (f.title)}
				<div
					class="flex h-full flex-col rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<h3 class="font-semibold text-foreground">{f.title}</h3>
					<p class="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section id="how-it-works" class="scroll-mt-20 bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div class="mb-12 overflow-hidden rounded-2xl">
			<img
				src="https://images.unsplash.com/photo-1477524076598-003de1c88dff?w=1600&h=400&fit=crop&q=80"
				alt="A vendor holding a sunflower bouquet at a farmers market"
				class="h-48 w-full object-cover sm:h-56 md:h-64 lg:h-72"
				loading="lazy"
			/>
		</div>
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Get started
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Up and running before your next market day.
			</h2>
		</div>
		<div class="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			<div
				class="absolute inset-x-0 top-6 -z-10 hidden h-px border-t border-dashed border-zinc-300 lg:block"
			></div>
			{#each steps as step (step.num)}
				<div class="flex flex-col items-center text-center">
					<div
						class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white shadow-md"
					>
						{step.num}
					</div>
					<h3 class="font-semibold text-foreground">{step.title}</h3>
					<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-10 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Pricing
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Simple. Honest. Built for small businesses.
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				No commissions. No per-order fees. Cancel anytime.
			</p>
		</div>

		<!-- Billing toggle -->
		<div class="flex justify-center">
			<div class="inline-flex items-center rounded-lg border bg-muted/50 p-0.5">
				<button
					type="button"
					onclick={() => {
						pricingInterval = 'monthly';
						track('pricing_toggle', { billing: 'monthly' });
					}}
					class="rounded-md px-4 py-2 text-sm transition-colors {pricingInterval === 'monthly'
						? 'bg-background font-medium text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Monthly
				</button>
				<button
					type="button"
					onclick={() => {
						pricingInterval = 'annual';
						track('pricing_toggle', { billing: 'annual' });
					}}
					class="flex items-center gap-2 rounded-md px-4 py-2 text-sm transition-colors {pricingInterval ===
					'annual'
						? 'bg-background font-medium text-foreground shadow-sm'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Annual
					<span
						class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
						>Save ~2 months</span
					>
				</button>
			</div>
		</div>

		<!-- 3-tier grid -->
		<div class="mt-10 grid items-start gap-6 lg:grid-cols-3">
			{#each plans as plan (plan.name)}
				<div class="relative flex flex-col {plan.highlight ? 'lg:scale-105' : ''}">
					{#if plan.highlight}
						<div class="absolute -top-3 right-0 left-0 flex justify-center">
							<Badge class="bg-primary text-primary-foreground shadow-sm">Most popular</Badge>
						</div>
					{/if}
					<div
						class="flex flex-1 flex-col overflow-hidden rounded-2xl border {plan.highlight
							? 'border-primary shadow-2xl ring-2 ring-primary/20'
							: 'bg-background'} "
					>
						{#if plan.highlight}
							<div class="h-1 bg-primary"></div>
						{/if}
						<div class="flex flex-1 flex-col p-7">
							<p class="text-lg font-bold text-foreground">{plan.name}</p>
							<p class="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

							<!-- Price -->
							<div class="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
								{#if plan.monthlyPrice === null}
									<span class="text-4xl font-bold text-foreground">Free</span>
								{:else if pricingInterval === 'monthly'}
									<span class="text-4xl font-bold text-foreground">${plan.monthlyPrice}</span>
									<span class="mb-1 text-sm text-muted-foreground">/ month</span>
								{:else}
									<span class="text-4xl font-bold text-foreground">${plan.annualYearlyPrice}</span>
									<span class="mb-1 text-sm text-muted-foreground">/ year</span>
									{#if plan.annualSavings}
										<span
											class="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
											>{plan.annualSavings}</span
										>
									{/if}
								{/if}
							</div>

							<ul class="mt-6 flex-1 space-y-2.5">
								{#each plan.features as feat (feat)}
									<li class="flex items-start gap-2 text-sm text-muted-foreground">
										<Icon
											icon="mdi:check-circle-outline"
											class="mt-0.5 h-4 w-4 shrink-0 text-primary/80"
										/>
										{feat}
									</li>
								{/each}
							</ul>

							<a
								href={loginHref}
								onclick={() =>
									track('cta_click', { location: `pricing_${plan.name.toLowerCase()}` })}
								class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors {plan.highlight
									? 'bg-primary text-white hover:bg-primary/90'
									: 'bg-gray-900 text-white hover:bg-gray-700'}"
							>
								{plan.cta}
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<div class="mt-8 text-center">
			<p class="text-sm text-muted-foreground">
				Add-ons billed separately. Activate or cancel anytime.
			</p>
			<p class="mt-1 text-xs text-muted-foreground">
				Add-ons: SMS Notifications · Advanced Analytics · Loyalty Program · Subscriptions
			</p>
		</div>
	</div>
</section>

<!-- Add-ons -->
<section class="bg-emerald-50/40 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Optional add-ons
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Add only what you actually need.
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				Available on Market and Pro plans. Activate or cancel from your dashboard.
			</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			{#each addons as addon (addon.name)}
				<div
					class="flex flex-col gap-3 rounded-2xl border bg-background p-6 hover:border-emerald-200 hover:shadow-sm"
				>
					<div class="flex items-start justify-between">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
							<Icon icon={addon.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
						</div>
						<div class="flex flex-col items-end gap-0.5">
							<span
								class="rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
								>{addon.price}</span
							>
							<span class="text-xs text-muted-foreground">or {addon.annualPrice}</span>
							<span class="text-xs text-primary/70">{addon.annualSavings}</span>
						</div>
					</div>
					<div>
						<h3 class="font-semibold text-foreground">{addon.name}</h3>
						<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{addon.desc}</p>
					</div>
				</div>
			{/each}
		</div>

		<!-- Cost estimator -->
		<div
			class="mx-auto mt-12 max-w-lg rounded-2xl border bg-background p-6 hover:border-emerald-200 hover:shadow-sm"
		>
			<h3 class="mb-4 text-base font-semibold text-foreground">Estimate your cost</h3>

			<!-- Base plan selector -->
			<div class="mb-5">
				<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Base plan
				</p>
				<div class="flex gap-2">
					{#each ['Starter', 'Market', 'Pro'] as p (p)}
						<button
							type="button"
							onclick={() => (estimatorPlan = p as 'Starter' | 'Market' | 'Pro')}
							class="flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors {estimatorPlan ===
							p
								? 'border-primary bg-primary/10 text-primary'
								: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}"
						>
							{p}
						</button>
					{/each}
				</div>
			</div>

			<div class="space-y-3">
				{#each addons as addon, i (addon.name)}
					<label class="flex cursor-pointer items-center justify-between gap-3">
						<span class="flex items-center gap-2 text-sm text-foreground">
							<input
								type="checkbox"
								class="h-4 w-4 rounded text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
								bind:checked={estimatorChecked[i]}
								disabled={estimatorPlan === 'Starter'}
							/>
							{addon.name}
						</span>
						<span class="text-sm font-medium text-muted-foreground">
							{pricingInterval === 'annual' ? `$${addon.annualMonthlyPrice}/mo` : addon.price}
						</span>
					</label>
				{/each}
			</div>
			{#if estimatorPlan === 'Starter'}
				<p class="mt-3 text-xs text-amber-600">Add-ons require Market or Pro plan.</p>
			{/if}
			<div class="mt-5 border-t pt-4">
				<div class="flex items-baseline justify-between">
					<span class="text-sm text-muted-foreground">Estimated total</span>
					<span class="text-lg font-bold text-foreground">
						{estimatorPlan === 'Starter' && estimatorTotal === 0
							? 'Free'
							: `$${estimatorBase + estimatorTotal}`}
						{#if estimatorPlan !== 'Starter' || estimatorTotal > 0}
							<span class="text-sm font-normal text-muted-foreground"> / month</span>
						{/if}
					</span>
				</div>
				<p class="mt-1 text-xs text-muted-foreground">
					Includes {estimatorPlan === 'Starter' ? 'Free' : `$${estimatorBase}`}
					{estimatorPlan} base ({pricingInterval === 'annual'
						? 'billed annually'
						: 'billed monthly'}) + selected add-ons.
				</p>
			</div>
		</div>
	</div>
</section>

<!-- FAQ -->
<section id="faq" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-12 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Frequently asked questions</h2>
		</div>
		<Accordion
			type="single"
			bind:value={openFaq}
			class="space-y-3"
			onValueChange={(v: string | undefined) => {
				if (v !== undefined) track('faq_open', { question: faqs[+v]?.q });
			}}
		>
			{#each faqs as faq, i (faq.q)}
				<AccordionItem
					value={String(i)}
					class="overflow-hidden rounded-xl border bg-background not-last:border-b"
				>
					<AccordionTrigger
						class="px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/50 hover:no-underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
					>
						{faq.q}
					</AccordionTrigger>
					<AccordionContent class="border-t px-5 text-sm leading-relaxed text-muted-foreground">
						{faq.a}
					</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	</div>
</section>

<!-- Closing CTA -->
<section
	class="relative overflow-hidden bg-primary px-6 py-20"
	style="
		background-image:
			linear-gradient(oklch(0.55 0.16 152.75 / 0.88), oklch(0.45 0.16 152.75 / 0.88)),
			url('https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1600&h=600&fit=crop&q=80');
		background-size: cover;
		background-position: center;
	"
>
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Ready to take your first pre-order?</h2>
		<p class="mt-4 text-lg text-primary-foreground/80">
			Set up your page today. Free, no credit card required.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'final_banner' })}
			class="mt-8 inline-block rounded-xl bg-background px-10 py-3.5 text-base font-bold text-primary/90 shadow-md transition-colors hover:bg-white/90"
		>
			Start for free
		</a>
	</div>
</section>

<!-- Footer -->
<footer class="border-t bg-background px-6 py-12">
	<div class="mx-auto max-w-6xl">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
			<div class="lg:col-span-1">
				<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
					Order<span class="text-primary">Local</span>
				</a>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Pre-orders and pickup, built for makers, bakers, and growers.
				</p>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Product</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href="#features" class="transition-colors hover:text-foreground">Features</a>
					<a href="#how-it-works" class="transition-colors hover:text-foreground">How it works</a>
					<a href="#pricing" class="transition-colors hover:text-foreground">Pricing</a>
					<a href="#faq" class="transition-colors hover:text-foreground">FAQ</a>
					<a href={resolve('/login')} class="transition-colors hover:text-foreground">Sign in</a>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Solutions</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/for-bakers')} class="transition-colors hover:text-foreground"
						>For Bakers</a
					>
					<a href={resolve('/for-makers')} class="transition-colors hover:text-foreground"
						>For Makers</a
					>
					<a href={resolve('/for-growers')} class="transition-colors hover:text-foreground"
						>For Growers</a
					>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Company</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a
						href="mailto:hello@getorderlocal.com"
						rel="external"
						class="transition-colors hover:text-foreground">Contact</a
					>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Legal</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/privacy')} class="transition-colors hover:text-foreground"
						>Privacy Policy</a
					>
					<a href={resolve('/terms')} class="transition-colors hover:text-foreground"
						>Terms of Service</a
					>
				</nav>
			</div>
		</div>
		<div class="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
			<p class="text-xs text-muted-foreground">
				© {new Date().getFullYear()} Order<span class="text-primary">Local</span>. All rights
				reserved.
			</p>
			<div class="flex items-center gap-4">
				<a
					href="https://x.com/getorderlocal"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Order Local on X"
					class="text-muted-foreground transition-colors hover:text-foreground"
				>
					<Icon icon="mdi:twitter" class="h-4 w-4" aria-hidden="true" />
				</a>
				<a
					href="https://linkedin.com/company/getorderlocal"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Order Local on LinkedIn"
					class="text-muted-foreground transition-colors hover:text-foreground"
				>
					<Icon icon="mdi:linkedin" class="h-4 w-4" aria-hidden="true" />
				</a>
			</div>
		</div>
	</div>
</footer>
