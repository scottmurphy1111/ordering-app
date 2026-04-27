<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { track } from '$lib/analytics';

	const loginHref = resolve('/login');

	const features = [
		{
			icon: 'mdi:storefront-outline',
			title: 'Custom online menu',
			desc: 'Your own branded menu page — shareable by link or QR code, no app required.',
			wide: false
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered payments',
			desc: 'Accept cards securely — funds land directly in your Stripe account.',
			wide: false
		},
		{
			icon: 'mdi:clipboard-list-outline',
			title: 'Real-time order management',
			desc: 'Orders arrive instantly — mark them ready and track every ticket in one place.',
			wide: false
		},
		{
			icon: 'mdi:tune-variant',
			title: 'Modifiers & options',
			desc: 'Add sizes, extras, and swaps to any item — pricing adjusts on its own.',
			wide: false
		},
		{
			icon: 'mdi:tag-multiple-outline',
			title: 'Categories & sort order',
			desc: 'Organize your menu by category and priority so customers find items instantly.',
			wide: false
		},
		{
			icon: 'mdi:email-fast-outline',
			title: 'Automated customer emails',
			desc: 'Branded order confirmations, ready alerts, and refund notices — sent without lifting a finger.',
			wide: false
		}
	];

	const addons = [
		{
			icon: 'mdi:table-chair',
			name: 'Table QR Codes',
			monthlyPrice: 9,
			annualMonthlyPrice: 7,
			price: '$9/mo',
			annualPrice: '$7/mo billed annually',
			annualSavings: 'save $24/yr',
			desc: 'One QR code per table — customers scan and order with their table number pre-filled.'
		},
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
			icon: 'mdi:web',
			name: 'Custom Domain',
			monthlyPrice: 12,
			annualMonthlyPrice: 10,
			price: '$12/mo',
			annualPrice: '$10/mo billed annually',
			annualSavings: 'save $24/yr',
			desc: 'Use your own URL — like menu.yourcafe.com — instead of the default ordering link.'
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

	let estimatorChecked = $state<boolean[]>(addons.map(() => false));
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

	const steps = [
		{
			num: '1',
			title: 'Create your account',

			desc: 'Sign up in under a minute. No credit card required to start.'
		},
		{
			num: '2',
			title: 'Connect Stripe',

			desc: 'Link your Stripe account so payments go straight to your bank.'
		},
		{
			num: '3',
			title: 'Build your menu',

			desc: 'Add items, photos, prices, and modifiers. Set up categories and sort order.'
		},
		{
			num: '4',
			title: 'Share & take orders',

			desc: 'Send your link or QR code — payments and order management run automatically.'
		}
	];

	const plans = [
		{
			name: 'Starter',
			price: 'Free',
			period: '',
			annualPrice: null as string | null,
			annualNote: null as string | null,
			description: 'Perfect for getting started.',
			features: [
				'Up to 10 menu items',
				'Online ordering & payments',
				'Order management',
				'Customer email receipts',
				'Menu QR code',
				'0% commission · Stripe fees only (2.9% + 30¢)'
			],
			addonsNote: null as string | null,
			cta: 'Start for free',
			href: loginHref,
			highlight: false
		},
		{
			name: 'Pro',
			price: '$79',
			period: '/ month',
			annualPrice: '$65' as string | null,
			annualNote: 'Billed $780/yr — 2 months free' as string | null,
			description: 'The full toolkit for your business.',
			features: [
				'Everything in Starter',
				'Unlimited menu items',
				'Website embed',
				'Priority support',
				'Eligible for all add-ons (priced separately)',
				'0% commission · Stripe fees only (2.9% + 30¢)'
			],
			addonsNote:
				'Table QR Codes · SMS Notifications · Custom Domain · Advanced Analytics · Loyalty Program · Subscriptions' as
					| string
					| null,
			cta: 'Get started',
			href: loginHref,
			highlight: true
		}
	];

	let pricingInterval = $state<'monthly' | 'annual'>('monthly');
	const estimatorBase = $derived(pricingInterval === 'annual' ? 65 : 79);

	const faqs = [
		{
			q: 'Does Order Local take a cut of my sales?',
			a: "No. We charge a flat monthly fee — we never take a percentage of your orders. Stripe's standard processing fee (2.9% + 30¢) applies."
		},
		{
			q: 'Do my customers need to download an app?',
			a: 'No app required. Your menu is a regular web page that works on any phone or desktop browser.'
		},
		{
			q: 'What happens when I hit 10 items on the Starter plan?',
			a: "You'll see a clear warning as you approach the limit. Once you hit 10 items, adding more is blocked until you upgrade to Pro ($79/mo) which includes unlimited items."
		},
		{
			q: 'What are add-ons and how do they work?',
			a: 'Add-ons are optional features available on the Pro plan — things like Table QR Codes, SMS Notifications, and a Loyalty Program. Activate or cancel any add-on anytime from your billing dashboard. You only pay for what you actually use.'
		},
		{
			q: 'Can I use my own branding?',
			a: 'Yes. Upload your logo, set your brand colors, and your menu page will feel like yours — not ours.'
		},
		{
			q: 'How do I get paid?',
			a: 'Payments go straight to your Stripe account. Payouts follow your normal Stripe schedule (typically 2 business days).'
		}
	];

	let openFaq = $state<number | null>(0);
	let mobileMenuOpen = $state(false);

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
	<title>Order Local — Online ordering for any local business</title>
	<meta
		name="description"
		content="Online ordering for any local business — branded storefront, Stripe checkout, no commissions. Live in minutes."
	/>
	<meta property="og:title" content="Order Local — Online ordering for any local business" />
	<meta
		property="og:description"
		content="Online ordering for any local business — branded storefront, Stripe checkout, no commissions. Live in minutes."
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
			<!-- Mobile menu button -->
			<button
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

<!-- Mobile menu — outside <header> so backdrop-blur doesn't create a new fixed containing block -->
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
	class="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background px-6 pt-20 pb-12"
>
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(22,163,74,0.08),transparent)]"
	></div>
	<div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
		<!-- Text -->
		<div class="flex flex-col items-center text-center">
			<span
				class="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary/90 uppercase"
			>
				Built for local businesses
			</span>
			<h1
				class="w-full max-w-[18ch] text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl md:max-w-[22ch]"
			>
				Online ordering, without the big-platform fees.
			</h1>
			<p class="mt-3 text-lg font-semibold text-emerald-700">0% commission. Live in minutes.</p>
			<p class="mt-4 w-full max-w-md text-lg leading-relaxed text-muted-foreground">
				Order Local gives any local business a branded online storefront and seamless checkout.
				Powered by Stripe, managed from a simple dashboard. No app. No commission cuts. Yours.
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
				No credit card required · Free plan available · Live in minutes
			</p>
		</div>

		<!-- Dashboard mock -->
		<div class="relative mx-auto w-full max-w-lg pr-2 pb-10">
			<!-- Subtle glow behind the card -->
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
						getorderlocal.com/dashboard
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
							<div class="px-2 py-1.5 text-[10px] text-gray-400">Menu</div>
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
								>Open live menu ↗</span
							>
						</div>
						<!-- KPI cards -->
						<div class="mb-3 grid grid-cols-3 gap-2">
							{#each [{ label: 'Revenue (30d)', value: '$4,280', change: '+12.4%' }, { label: 'Orders', value: '63', change: '+8.2%' }, { label: 'Avg Order', value: '$67.90', change: '+3.1%' }] as kpi (kpi.label)}
								<div class="rounded-lg border bg-background p-2 shadow-sm">
									<p class="text-[8px] font-medium text-muted-foreground uppercase">{kpi.label}</p>
									<p class="mt-0.5 text-sm font-bold text-foreground">{kpi.value}</p>
									<p class="text-[9px] font-medium text-primary">{kpi.change}</p>
								</div>
							{/each}
						</div>
						<!-- Recent orders -->
						<div class="rounded-lg border bg-background p-2.5 shadow-sm">
							<p class="mb-2 text-[10px] font-semibold text-foreground">Recent orders</p>
							<div class="space-y-1.5">
								{#each [{ num: '#142', items: 'Avocado Toast, Flat White', status: 'New', color: 'bg-blue-100 text-blue-700' }, { num: '#141', items: 'Acai Bowl', status: 'Preparing', color: 'bg-yellow-100 text-yellow-700' }, { num: '#140', items: 'Flat White ×2', status: 'Ready', color: 'bg-green-100 text-green-700' }] as order (order.num)}
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

			<!-- Floating customer menu mock -->
			<div
				class="absolute right-0 -bottom-2 z-10 w-44 overflow-hidden rounded-2xl border bg-background shadow-2xl ring-1 ring-black/5"
			>
				<!-- Menu header -->
				<div class="bg-gray-900 px-3 py-2.5">
					<div class="flex items-center gap-2">
						<div
							class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-[9px] font-bold text-white"
						>
							OL
						</div>
						<div>
							<p class="text-[10px] font-bold text-white">The Daily Brew</p>
							<p class="text-[8px] text-gray-400">Order ahead · pickup</p>
						</div>
					</div>
				</div>
				<!-- Category pills -->
				<div class="flex gap-1 border-b bg-muted/30 px-2 py-1.5">
					<span class="rounded-full bg-primary px-2 py-0.5 text-[7px] font-semibold text-white"
						>Coffee</span
					>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground"
						>Food</span
					>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground"
						>Extras</span
					>
				</div>
				<!-- Menu items -->
				<div class="divide-y px-2">
					{#each [{ name: 'Flat White', desc: 'Double shot, steamed milk', price: '$5.50', color: 'bg-amber-100' }, { name: 'Avocado Toast', desc: 'Sourdough, poached egg', price: '$14.00', color: 'bg-green-100' }, { name: 'Acai Bowl', desc: 'Granola, banana, honey', price: '$12.50', color: 'bg-purple-100' }] as item (item.name)}
						<div class="flex items-center justify-between gap-2 py-2">
							<div class="flex items-center gap-1.5">
								<div class="h-8 w-8 shrink-0 rounded-lg {item.color}"></div>
								<div>
									<p class="text-[8px] font-semibold text-foreground">{item.name}</p>
									<p class="text-[7px] leading-tight text-muted-foreground">{item.desc}</p>
									<p class="mt-0.5 text-[8px] font-medium text-foreground">{item.price}</p>
								</div>
							</div>
							<button class="shrink-0 rounded-full bg-primary p-1">
								<Icon icon="mdi:plus" class="h-2.5 w-2.5 text-white" />
							</button>
						</div>
					{/each}
				</div>
				<!-- Cart bar -->
				<div class="bg-primary px-3 py-2">
					<p class="text-center text-[8px] font-semibold text-white">
						View cart · 2 items · $19.50
					</p>
				</div>
			</div>
		</div>
	</div>
</section>

<div class="border-y bg-muted/40 py-4">
	<p class="px-6 text-center text-sm text-muted-foreground">
		Built for <span class="font-medium text-foreground">restaurants</span> ·
		<span class="font-medium text-foreground">cafes</span> ·
		<span class="font-medium text-foreground">food trucks</span> ·
		<span class="font-medium text-foreground">bakeries</span> ·
		<span class="font-medium text-foreground">boutiques</span> · and any local business that sells online
	</p>
</div>

<!-- Features -->
<section id="features" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-14 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">
				Everything you need to sell online
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				No bloat. Just the tools a local business actually uses — whether you're selling food,
				goods, or services.
			</p>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				<div
					class="flex h-full flex-col rounded-2xl border bg-muted/50 p-6 transition hover:border-emerald-200 hover:shadow-sm {f.wide
						? 'lg:col-span-2'
						: ''}"
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
		<div class="mb-14 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Up and running in minutes</h2>
			<p class="mt-3 text-lg text-muted-foreground">Four steps from sign-up to your first order.</p>
		</div>
		<div class="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Connecting dashed line (desktop only) -->
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
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Simple, honest pricing</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				No commissions. No surprise fees. Cancel anytime.
			</p>
		</div>

		<div class="mx-auto grid max-w-2xl items-stretch gap-6 pt-5 sm:grid-cols-2">
			{#each plans as plan (plan.name)}
				{@const isAnnualPro = plan.highlight && pricingInterval === 'annual' && plan.annualPrice}
				<div class="relative flex flex-col">
					{#if plan.highlight}
						<span
							class="absolute -top-2.5 left-4 z-10 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold whitespace-nowrap text-white"
							>Most popular</span
						>
					{/if}
					<div
						class="flex flex-1 flex-col rounded-2xl border p-7
							{plan.highlight
							? 'border-primary bg-background text-foreground shadow-2xl ring-2 ring-primary/20'
							: 'bg-background text-foreground'}"
					>
						<!-- Name + toggle row -->
						<div class="flex min-h-[2rem] items-center justify-between gap-2">
							<p class="text-lg font-bold text-foreground">
								{plan.name}
							</p>
							{#if plan.highlight}
								<div class="flex shrink-0 items-center rounded-lg border bg-muted/50 p-0.5">
									<button
										type="button"
										onclick={() => {
											pricingInterval = 'monthly';
											track('pricing_toggle', { billing: 'monthly' });
										}}
										class="rounded-md px-2.5 py-1 text-xs transition-colors {pricingInterval ===
										'monthly'
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
										class="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors {pricingInterval ===
										'annual'
											? 'bg-background font-medium text-foreground shadow-sm'
											: 'text-muted-foreground hover:text-foreground'}"
									>
										Annual
										<span
											class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
										>
											-2 mo
										</span>
									</button>
								</div>
							{/if}
						</div>

						<!-- Price -->
						<div class="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
							<span class="text-4xl font-bold text-foreground">
								{isAnnualPro ? plan.annualPrice : plan.price}
							</span>
							{#if plan.period}
								<span class="mb-1 text-sm text-muted-foreground">{plan.period}</span>
							{/if}
							{#if isAnnualPro}
								<span class="mb-1 text-sm text-muted-foreground/60 line-through">{plan.price}</span>
							{/if}
						</div>

						<!-- Description / annual note -->
						<p class="mt-1 text-sm text-muted-foreground">
							{isAnnualPro && plan.annualNote ? plan.annualNote : plan.description}
						</p>

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

						{#if plan.highlight}
							<p class="mt-4 text-xs leading-relaxed text-muted-foreground">
								Add-ons billed separately. Activate or cancel anytime.
							</p>
						{/if}

						{#if plan.addonsNote}
							<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
								Add-ons: {plan.addonsNote}
							</p>
						{/if}

						<a
							href={loginHref}
							onclick={() =>
								track('cta_click', {
									location: plan.highlight ? 'pricing_pro' : 'pricing_starter'
								})}
							class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors
								{plan.highlight
								? 'bg-primary text-white hover:bg-primary/90'
								: 'bg-gray-900 text-white hover:bg-gray-700'}"
						>
							{plan.cta}
						</a>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Add-ons -->
<section class="bg-emerald-50/40 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary/90 uppercase"
			>
				Optional add-ons
			</span>
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Only pay for what you need</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				Available on the Pro plan — activate or cancel anytime from your dashboard.
			</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each addons as addon (addon.name)}
				<div class="flex flex-col gap-3 rounded-2xl border border-emerald-100 bg-background p-6">
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
		<p class="mt-8 text-center text-sm text-muted-foreground">
			Add-ons require an active Pro plan. Activate or cancel anytime from your dashboard.
		</p>

		<!-- Cost estimator -->
		<div
			class="mx-auto mt-12 max-w-lg rounded-2xl border border-emerald-100 bg-background p-6 shadow-sm"
		>
			<h3 class="mb-4 text-base font-semibold text-foreground">Estimate your cost</h3>
			<div class="space-y-3">
				{#each addons as addon, i (addon.name)}
					<label class="flex cursor-pointer items-center justify-between gap-3">
						<span class="flex items-center gap-2 text-sm text-foreground">
							<input
								type="checkbox"
								class="h-4 w-4 rounded text-primary accent-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
								bind:checked={estimatorChecked[i]}
							/>
							{addon.name}
						</span>
						<span class="text-sm font-medium text-muted-foreground">
							{pricingInterval === 'annual' ? `$${addon.annualMonthlyPrice}/mo` : addon.price}
						</span>
					</label>
				{/each}
			</div>
			<div class="mt-5 border-t pt-4">
				<div class="flex items-baseline justify-between">
					<span class="text-sm text-muted-foreground">Estimated total</span>
					<span class="text-lg font-bold text-foreground"
						>${estimatorBase + estimatorTotal}<span
							class="text-sm font-normal text-muted-foreground"
						>
							/ month</span
						></span
					>
				</div>
				<p class="mt-1 text-xs text-muted-foreground">
					Includes ${estimatorBase} Pro base ({pricingInterval === 'annual'
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
		<div class="space-y-3">
			{#each faqs as faq, i (faq.q)}
				{@const panelId = `faq-panel-${i}`}
				{@const btnId = `faq-btn-${i}`}
				<div class="overflow-hidden rounded-xl border bg-background">
					<button
						id={btnId}
						aria-expanded={openFaq === i}
						aria-controls={panelId}
						class="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
						onclick={() => {
							if (openFaq !== i) track('faq_open', { question: faq.q });
							openFaq = openFaq === i ? null : i;
						}}
					>
						{faq.q}
						<Icon
							icon="mdi:chevron-down"
							class="ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform {openFaq === i
								? 'rotate-180'
								: ''}"
							aria-hidden="true"
						/>
					</button>
					{#if openFaq === i}
						<div
							id={panelId}
							role="region"
							aria-labelledby={btnId}
							class="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground"
						>
							{faq.a}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="bg-primary/95 px-6 py-20">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Ready to take your first order?</h2>
		<p class="mt-4 text-lg text-primary-foreground/80">
			Set up your menu today — free, no credit card required.
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

<footer class="border-t bg-background px-6 py-12">
	<div class="mx-auto max-w-6xl">
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<div>
				<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
					Order<span class="text-primary">Local</span>
				</a>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Online ordering, without the big-platform fees.
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
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Company</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href="mailto:hello@getorderlocal.com" rel="external" class="transition-colors hover:text-foreground">Contact</a>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Legal</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/privacy')} class="transition-colors hover:text-foreground">Privacy Policy</a>
					<a href={resolve('/terms')} class="transition-colors hover:text-foreground">Terms of Service</a>
				</nav>
			</div>
		</div>
		<div class="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
			<p class="text-xs text-muted-foreground">
				© {new Date().getFullYear()} Order<span class="text-primary">Local</span>. All rights reserved.
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
