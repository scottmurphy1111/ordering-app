<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	const loginHref = resolve('/login');

	const features = [
		{
			icon: 'mdi:storefront-outline',
			title: 'Custom online menu',
			desc: 'Your own branded menu page — shareable by link or QR code. No app download required for customers.'
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered payments',
			desc: 'Accept credit cards securely. Funds go directly to your bank account via Stripe.'
		},
		{
			icon: 'mdi:clipboard-list-outline',
			title: 'Real-time order management',
			desc: 'Orders come in instantly. Mark them ready, track history, and stay on top of every ticket.'
		},
		{
			icon: 'mdi:tune-variant',
			title: 'Modifiers & options',
			desc: 'Add sizes, add-ons, and swap-outs to any item. Pricing adjusts automatically.'
		},
		{
			icon: 'mdi:tag-multiple-outline',
			title: 'Categories & sort order',
			desc: 'Organize your menu exactly how you want customers to see it — by category and priority.'
		},
		{
			icon: 'mdi:email-fast-outline',
			title: 'Automated customer emails',
			desc: 'Customers get branded emails when their order is confirmed, ready, or refunded — automatically.'
		}
	];

	const addons = [
		{
			icon: 'mdi:table-chair',
			name: 'Table QR Codes',
			price: '$9/mo',
			desc: 'One QR code per table — customers scan and order with their table number pre-filled. Perfect for dine-in.'
		},
		{
			icon: 'mdi:message-text-outline',
			name: 'SMS Notifications',
			price: '$19/mo',
			desc: 'Text your customers the moment their order is ready. Fewer missed pickups, happier guests.'
		},
		{
			icon: 'mdi:web',
			name: 'Custom Domain',
			price: '$12/mo',
			desc: 'Use your own URL — like menu.yourcafe.com — instead of the default ordering link.'
		},
		{
			icon: 'mdi:chart-line',
			name: 'Advanced Analytics',
			price: '$19/mo',
			desc: 'Revenue trends, top-selling items, peak hours, and customer insights — all in one dashboard.'
		},
		{
			icon: 'mdi:star-circle-outline',
			name: 'Loyalty Program',
			price: '$29/mo',
			desc: 'Reward repeat customers with a digital stamp card or points system built into your ordering flow.'
		},
		{
			icon: 'mdi:refresh-circle',
			name: 'Subscriptions',
			price: '$29/mo',
			desc: 'Sell recurring items or services — meal plans, weekly boxes, retainers. Customers subscribe and are billed automatically.'
		}
	];

	const steps = [
		{
			num: '1',
			title: 'Create your account',
			desc: 'Sign up in under a minute. No credit card required to start.'
		},
		{
			num: '2',
			title: 'Build your menu',
			desc: 'Add items, photos, prices, and modifiers. Set up categories and sort order.'
		},
		{
			num: '3',
			title: 'Share your link',
			desc: 'Send customers your menu URL or print a QR code for your counter.'
		},
		{
			num: '4',
			title: 'Start taking orders',
			desc: 'Connect Stripe and go live. Orders and payments handled automatically.'
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
				'Menu QR code'
			],
			addonsNote: null as string | null,
			cta: 'Get started free',
			href: loginHref,
			highlight: false
		},
		{
			name: 'Pro',
			price: '$79',
			period: '/ month',
			annualPrice: '$65' as string | null,
			annualNote: 'Billed $780/yr — 2 months free' as string | null,
			description: 'The full toolkit for serious operators.',
			features: [
				'Everything in Starter',
				'Unlimited menu items',
				'Website embed',
				'Priority support',
				'Access to all add-ons'
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

	let openFaq = $state<number | null>(null);
</script>

<svelte:head>
	<title>Order Local — Online ordering for any local business</title>
	<meta
		name="description"
		content="Simple, affordable online ordering for local restaurants, cafes, boutiques, bakeries, and any business ready to sell online. Accept payments, manage orders, and grow — without the big-platform fees."
	/>
</svelte:head>

<!-- Nav -->
<header class="sticky top-0 z-50 border-b bg-background/90 backdrop-blur-sm">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
			Order<span class="text-primary">Local</span>
		</a>
		<nav class="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
			<a href="#features" class="transition-colors hover:text-foreground">Features</a>
			<a href="#how-it-works" class="transition-colors hover:text-foreground">How it works</a>
			<a href="#pricing" class="transition-colors hover:text-foreground">Pricing</a>
			<a href="#faq" class="transition-colors hover:text-foreground">FAQ</a>
		</nav>
		<div class="flex items-center gap-3">
			<a
				href={loginHref}
				class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				Sign in
			</a>
			<a
				href={loginHref}
				class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90"
			>
				Get started free
			</a>
		</div>
	</div>
</header>

<!-- Hero -->
<section class="relative overflow-hidden bg-background px-6 pt-20 pb-24">
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
			<h1 class="text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl">
				Online ordering,<br />without the<br />big-platform fees.
			</h1>
			<p class="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
				Order Local gives any local business a branded online storefront and seamless checkout.
				Powered by Stripe, managed from a simple dashboard. No app. No commission cuts. Yours.
			</p>
			<div class="mt-10 flex flex-col items-center gap-3 sm:flex-row">
				<a
					href={loginHref}
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
		<div class="relative mx-auto w-full max-w-lg pb-10 pr-2">
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
						app.orderlocal.com/dashboard
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
							<div class="rounded-md bg-primary px-2 py-1.5 text-[10px] font-medium text-white">Overview</div>
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
							{#each [
								{ label: 'Revenue (30d)', value: '$4,280', change: '+12.4%' },
								{ label: 'Orders', value: '63', change: '+8.2%' },
								{ label: 'Avg Order', value: '$67.90', change: '+3.1%' }
							] as kpi (kpi.label)}
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
								{#each [
									{ num: '#142', items: 'Avocado Toast, Flat White', status: 'New', color: 'bg-blue-100 text-blue-700' },
									{ num: '#141', items: 'Acai Bowl', status: 'Preparing', color: 'bg-yellow-100 text-yellow-700' },
									{ num: '#140', items: 'Flat White ×2', status: 'Ready', color: 'bg-green-100 text-green-700' }
								] as order (order.num)}
									<div class="flex items-center justify-between gap-2">
										<div class="min-w-0">
											<span class="text-[9px] font-medium text-foreground">{order.num}</span>
											<span class="text-[9px] text-muted-foreground"> · {order.items}</span>
										</div>
										<span class="shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold {order.color}"
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
			<div class="absolute right-0 -bottom-2 z-10 w-44 overflow-hidden rounded-2xl border bg-background shadow-2xl ring-1 ring-black/5">
				<!-- Menu header -->
				<div class="bg-gray-900 px-3 py-2.5">
					<div class="flex items-center gap-2">
						<div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary text-[9px] font-bold text-white">OL</div>
						<div>
							<p class="text-[10px] font-bold text-white">The Daily Brew</p>
							<p class="text-[8px] text-gray-400">Order ahead · pickup</p>
						</div>
					</div>
				</div>
				<!-- Category pills -->
				<div class="flex gap-1 border-b bg-muted/30 px-2 py-1.5">
					<span class="rounded-full bg-primary px-2 py-0.5 text-[7px] font-semibold text-white">Coffee</span>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground">Food</span>
					<span class="rounded-full bg-muted px-2 py-0.5 text-[7px] text-muted-foreground">Extras</span>
				</div>
				<!-- Menu items -->
				<div class="divide-y px-2">
					{#each [
						{ name: 'Flat White', desc: 'Double shot, steamed milk', price: '$5.50', color: 'bg-amber-100' },
						{ name: 'Avocado Toast', desc: 'Sourdough, poached egg', price: '$14.00', color: 'bg-green-100' },
						{ name: 'Acai Bowl', desc: 'Granola, banana, honey', price: '$12.50', color: 'bg-purple-100' }
					] as item (item.name)}
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
					<p class="text-center text-[8px] font-semibold text-white">View cart · 2 items · $19.50</p>
				</div>
			</div>

		</div>
	</div>
</section>

<!-- Social proof bar -->
<div class="border-y bg-muted/50 py-5">
	<div class="mx-auto max-w-4xl px-6 text-center">
		<p class="text-sm font-medium text-muted-foreground">
			Trusted by independent restaurants, cafes, food trucks, bakeries, boutiques, and local
			businesses of all kinds
		</p>
	</div>
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
				<div class="rounded-2xl border bg-muted/50 p-6">
					<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon={f.icon} class="h-5 w-5 text-primary" />
					</div>
					<h3 class="font-semibold text-foreground">{f.title}</h3>
					<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
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
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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

		<!-- Billing interval toggle -->
		<div class="mb-10 flex justify-center">
			<div class="flex items-center gap-1 rounded-xl border bg-background p-1 shadow-sm">
				<button
					onclick={() => (pricingInterval = 'monthly')}
					class="rounded-lg px-5 py-2 text-sm font-medium transition-colors
						{pricingInterval === 'monthly'
						? 'bg-gray-900 text-white'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Monthly
				</button>
				<button
					onclick={() => (pricingInterval = 'annual')}
					class="flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-colors
						{pricingInterval === 'annual'
						? 'bg-gray-900 text-white'
						: 'text-muted-foreground hover:text-foreground'}"
				>
					Annual
					<span
						class="rounded-full px-2 py-0.5 text-xs font-semibold
							{pricingInterval === 'annual'
							? 'bg-primary text-primary-foreground'
							: 'bg-green-100 text-primary/90'}"
					>
						Save 2 months
					</span>
				</button>
			</div>
		</div>

		<div class="mx-auto grid max-w-2xl items-stretch gap-6 sm:grid-cols-2">
			{#each plans as plan (plan.name)}
				{@const displayPrice =
					plan.highlight && pricingInterval === 'annual' && plan.annualPrice
						? plan.annualPrice
						: plan.price}
				<div
					class="flex flex-col rounded-2xl border p-7
						{plan.highlight
						? 'border-primary bg-primary text-white shadow-xl'
						: ' bg-background text-foreground'}"
				>
					{#if plan.highlight}
						<span
							class="mb-3 self-start rounded-full bg-background/20 px-3 py-0.5 text-xs font-semibold text-white"
							>Most popular</span
						>
					{/if}
					<p class="text-lg font-bold {plan.highlight ? 'text-white' : 'text-foreground'}">
						{plan.name}
					</p>
					<div class="mt-2 flex items-end gap-1">
						<span class="text-4xl font-bold {plan.highlight ? 'text-white' : 'text-foreground'}"
							>{displayPrice}</span
						>
						{#if plan.period}
							<span
								class="mb-1 text-sm {plan.highlight
									? 'text-primary-foreground/80'
									: 'text-muted-foreground'}">{plan.period}</span
							>
						{/if}
					</div>
					{#if plan.highlight && pricingInterval === 'annual' && plan.annualNote}
						<p class="mt-1 text-sm text-primary-foreground/70">{plan.annualNote}</p>
					{:else}
						<p
							class="mt-1 text-sm {plan.highlight
								? 'text-primary-foreground/80'
								: 'text-muted-foreground'}"
						>
							{plan.description}
						</p>
					{/if}

					<ul class="mt-6 flex-1 space-y-2.5">
						{#each plan.features as feat (feat)}
							<li
								class="flex items-start gap-2 text-sm {plan.highlight
									? 'text-white'
									: 'text-muted-foreground'}"
							>
								<Icon
									icon="mdi:check-circle-outline"
									class="mt-0.5 h-4 w-4 shrink-0 {plan.highlight
										? 'text-primary-foreground/70'
										: 'text-primary/80'}"
								/>
								{feat}
							</li>
						{/each}
					</ul>

					{#if plan.addonsNote}
						<p
							class="mt-4 text-xs leading-relaxed {plan.highlight
								? 'text-primary-foreground/70'
								: 'text-muted-foreground'}"
						>
							Add-ons: {plan.addonsNote}
						</p>
					{/if}

					<a
						href={loginHref}
						class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors
							{plan.highlight
							? 'bg-background text-primary/90 hover:bg-primary/5'
							: 'bg-gray-900 text-white hover:bg-gray-700'}"
					>
						{plan.cta}
					</a>
				</div>
			{/each}
		</div>
		<p class="mt-8 text-center text-xs text-muted-foreground">
			All plans include Stripe payment processing. Stripe charges 2.9% + 30¢ per transaction — we
			never take a cut.
		</p>
	</div>
</section>

<!-- Add-ons -->
<section class="bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary/90 uppercase"
			>
				Optional add-ons
			</span>
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Only pay for what you need</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				Every plan starts lean. Add features as your business grows — activate or cancel anytime
				from your dashboard.
			</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each addons as addon (addon.name)}
				<div class="flex flex-col gap-3 rounded-2xl border bg-background p-6">
					<div class="flex items-center justify-between">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
							<Icon icon={addon.icon} class="h-5 w-5 text-primary" />
						</div>
						<span
							class="rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
							>{addon.price}</span
						>
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
				<div class="overflow-hidden rounded-xl border bg-background">
					<button
						class="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
						onclick={() => (openFaq = openFaq === i ? null : i)}
					>
						{faq.q}
						<Icon
							icon="mdi:chevron-down"
							class="ml-4 h-5 w-5 shrink-0 text-muted-foreground transition-transform {openFaq === i
								? 'rotate-180'
								: ''}"
						/>
					</button>
					{#if openFaq === i}
						<div class="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground">
							{faq.a}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="bg-primary px-6 py-20">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Ready to take your first order?</h2>
		<p class="mt-4 text-lg text-primary-foreground/80">
			Set up your menu today — free, no credit card required.
		</p>
		<a
			href={loginHref}
			class="mt-8 inline-block rounded-xl bg-background px-10 py-3.5 text-base font-bold text-primary/90 shadow-md transition-colors hover:bg-white/90"
		>
			Create your free account
		</a>
	</div>
</section>

<!-- Footer -->
<footer class="border-t bg-background px-6 py-10">
	<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
		<p class="text-xs text-muted-foreground">
			© {new Date().getFullYear()} Order<span class="text-primary">Local</span>. All rights
			reserved.
		</p>
		<nav class="flex gap-4 text-xs text-muted-foreground">
			<a href={loginHref} class="transition-colors hover:text-muted-foreground">Sign in</a>
			<a
				href="mailto:hello@getorderlocal.com"
				rel="external"
				class="transition-colors hover:text-muted-foreground">Contact</a
			>
		</nav>
	</div>
</footer>
