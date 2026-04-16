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
			icon: 'mdi:chart-bar',
			title: 'Analytics',
			desc: 'See your top items, busiest hours, and revenue trends at a glance.'
		}
	];

	const steps = [
		{ num: '1', title: 'Create your account', desc: 'Sign up in under a minute. No credit card required to start.' },
		{ num: '2', title: 'Build your menu', desc: 'Add items, photos, prices, and modifiers. Set up categories and sort order.' },
		{ num: '3', title: 'Share your link', desc: 'Send customers your menu URL or print a QR code for your counter.' },
		{ num: '4', title: 'Start taking orders', desc: 'Connect Stripe and go live. Orders and payments handled automatically.' }
	];

	const plans = [
		{
			name: 'Starter',
			price: 'Free',
			period: '',
			description: 'Perfect for getting started.',
			features: ['1 location', 'Up to 20 menu items', 'Stripe payments', 'Basic order management', 'QR code menu link'],
			cta: 'Get started free',
			href: loginHref,
			highlight: false
		},
		{
			name: 'Pro',
			price: '$29',
			period: '/ month',
			description: 'For growing restaurants and cafes.',
			features: ['1 location', 'Unlimited menu items', 'Stripe payments', 'Full order history & analytics', 'Custom branding', 'Priority support'],
			cta: 'Start free trial',
			href: loginHref,
			highlight: true
		},
		{
			name: 'Multi-location',
			price: '$79',
			period: '/ month',
			description: 'Run multiple spots from one dashboard.',
			features: ['Up to 5 locations', 'Unlimited menu items', 'All Pro features', 'Team accounts', 'Dedicated onboarding'],
			cta: 'Contact us',
			href: 'mailto:hello@orderlocal.app',
			highlight: false
		}
	];

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
			q: 'Can I use my own branding?',
			a: 'Yes. Upload your logo, set your brand colors, and your menu page will feel like yours — not ours.'
		},
		{
			q: 'How do I get paid?',
			a: 'Payments go straight to your Stripe account. Payouts follow your normal Stripe schedule (typically 2 business days).'
		},
		{
			q: 'Can I try it before subscribing?',
			a: 'The Starter plan is free forever. Pro and Multi-location plans come with a 14-day free trial — no card required.'
		}
	];

	const mockItems = [
		{ name: 'Avocado Toast', price: '$12.00', tag: 'Popular' },
		{ name: 'Flat White', price: '$4.50', tag: '' },
		{ name: 'Acai Bowl', price: '$14.00', tag: 'New' }
	];

	let openFaq = $state<number | null>(null);
</script>

<svelte:head>
	<title>Order Local — Online ordering for any local business</title>
	<meta name="description" content="Simple, affordable online ordering for local restaurants, cafes, boutiques, bakeries, and any business ready to sell online. Accept payments, manage orders, and grow — without the big-platform fees." />
</svelte:head>

<!-- Nav -->
<header class="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a href={resolve('/')} class="text-xl font-bold text-gray-900 tracking-tight">
			Order<span class="text-green-600">Local</span>
		</a>
		<nav class="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex">
			<a href="#features" class="hover:text-gray-900 transition-colors">Features</a>
			<a href="#how-it-works" class="hover:text-gray-900 transition-colors">How it works</a>
			<a href="#pricing" class="hover:text-gray-900 transition-colors">Pricing</a>
			<a href="#faq" class="hover:text-gray-900 transition-colors">FAQ</a>
		</nav>
		<div class="flex items-center gap-3">
			<a href={loginHref} class="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
				Sign in
			</a>
			<a
				href={loginHref}
				class="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors"
			>
				Get started free
			</a>
		</div>
	</div>
</header>

<!-- Hero -->
<section class="relative overflow-hidden bg-white px-6 pb-24 pt-20">
	<div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(22,163,74,0.08),transparent)]"></div>
	<div class="mx-auto max-w-4xl text-center">
		<span class="mb-4 inline-block rounded-full bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700">
			Built for local businesses
		</span>
		<h1 class="text-5xl font-bold leading-tight tracking-tight text-gray-900 sm:text-6xl">
			Online ordering,<br />without the big-platform fees.
		</h1>
		<p class="mx-auto mt-6 max-w-2xl text-lg text-gray-500 leading-relaxed">
			Order Local gives any local business — restaurant, cafe, food truck, bakery, boutique, or pop-up — a branded online storefront and seamless checkout. Powered by Stripe, managed from a simple dashboard. No app. No commission cuts. Yours.
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href={loginHref}
				class="w-full rounded-xl bg-green-600 px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-green-700 transition-colors sm:w-auto"
			>
				Start for free
			</a>
			<a
				href="#how-it-works"
				class="w-full rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors sm:w-auto"
			>
				See how it works
			</a>
		</div>
		<p class="mt-4 text-xs text-gray-400">No credit card required · Free plan available · Live in minutes</p>
	</div>

	<!-- Mock menu card -->
	<div class="mx-auto mt-16 max-w-sm rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
		<div class="bg-green-600 px-5 py-4">
			<p class="text-xs font-medium text-green-100">Your branded menu page</p>
			<p class="text-lg font-bold text-white mt-0.5">The Corner Cafe</p>
		</div>
		<div class="divide-y divide-gray-100">
			{#each mockItems as item (item.name)}
				<div class="flex items-center justify-between px-5 py-3">
					<div>
						<p class="text-sm font-medium text-gray-900">{item.name}</p>
						{#if item.tag}
							<span class="rounded-full bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">{item.tag}</span>
						{/if}
					</div>
					<div class="flex items-center gap-3">
						<span class="text-sm font-semibold text-gray-700">{item.price}</span>
						<button class="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white">+ Add</button>
					</div>
				</div>
			{/each}
		</div>
		<div class="px-5 py-3 bg-gray-50 flex items-center justify-between">
			<span class="text-xs text-gray-500">2 items · $16.50</span>
			<button class="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-bold text-white">View Cart</button>
		</div>
	</div>
</section>

<!-- Social proof bar -->
<div class="border-y border-gray-100 bg-gray-50 py-5">
	<div class="mx-auto max-w-4xl px-6 text-center">
		<p class="text-sm font-medium text-gray-500">
			Trusted by independent restaurants, cafes, food trucks, bakeries, boutiques, and local businesses of all kinds
		</p>
	</div>
</div>

<!-- Features -->
<section id="features" class="bg-white px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">Everything you need to sell online</h2>
			<p class="mt-3 text-gray-500 text-lg">No bloat. Just the tools a local business actually uses — whether you're selling food, goods, or services.</p>
		</div>
		<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as f (f.title)}
				<div class="rounded-2xl border border-gray-100 bg-gray-50 p-6">
					<div class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
						<Icon icon={f.icon} class="h-5 w-5 text-green-700" />
					</div>
					<h3 class="font-semibold text-gray-900">{f.title}</h3>
					<p class="mt-1.5 text-sm text-gray-500 leading-relaxed">{f.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section id="how-it-works" class="bg-gray-50 px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">Up and running in minutes</h2>
			<p class="mt-3 text-gray-500 text-lg">Four steps from sign-up to your first order.</p>
		</div>
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			{#each steps as step (step.num)}
				<div class="flex flex-col items-center text-center">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-lg font-bold text-white shadow-md">
						{step.num}
					</div>
					<h3 class="font-semibold text-gray-900">{step.title}</h3>
					<p class="mt-1.5 text-sm text-gray-500 leading-relaxed">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="bg-white px-6 py-24">
	<div class="mx-auto max-w-6xl">
		<div class="text-center mb-14">
			<h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">Simple, honest pricing</h2>
			<p class="mt-3 text-gray-500 text-lg">No commissions. No surprise fees. Cancel anytime.</p>
		</div>
		<div class="grid gap-6 lg:grid-cols-3 lg:items-start">
			{#each plans as plan (plan.name)}
				<div
					class="rounded-2xl border p-7 flex flex-col
						{plan.highlight
							? 'border-green-500 bg-green-600 shadow-xl text-white'
							: 'border-gray-200 bg-white text-gray-900'}"
				>
					{#if plan.highlight}
						<span class="mb-3 self-start rounded-full bg-white/20 px-3 py-0.5 text-xs font-semibold text-white">Most popular</span>
					{/if}
					<p class="text-lg font-bold {plan.highlight ? 'text-white' : 'text-gray-900'}">{plan.name}</p>
					<div class="mt-2 flex items-end gap-1">
						<span class="text-4xl font-bold {plan.highlight ? 'text-white' : 'text-gray-900'}">{plan.price}</span>
						{#if plan.period}
							<span class="mb-1 text-sm {plan.highlight ? 'text-green-100' : 'text-gray-400'}">{plan.period}</span>
						{/if}
					</div>
					<p class="mt-1 text-sm {plan.highlight ? 'text-green-100' : 'text-gray-500'}">{plan.description}</p>

					<ul class="mt-6 flex-1 space-y-2.5">
						{#each plan.features as feat (feat)}
							<li class="flex items-start gap-2 text-sm {plan.highlight ? 'text-white' : 'text-gray-600'}">
								<Icon
									icon="mdi:check-circle-outline"
									class="mt-0.5 h-4 w-4 shrink-0 {plan.highlight ? 'text-green-200' : 'text-green-500'}"
								/>
								{feat}
							</li>
						{/each}
					</ul>

					{#if plan.href.startsWith('mailto:')}
						<a
							href={plan.href}
							rel="external"
							class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors
								{plan.highlight
									? 'bg-white text-green-700 hover:bg-green-50'
									: 'bg-gray-900 text-white hover:bg-gray-700'}"
						>
							{plan.cta}
						</a>
					{:else}
						<a
							href={loginHref}
							class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors
								{plan.highlight
									? 'bg-white text-green-700 hover:bg-green-50'
									: 'bg-gray-900 text-white hover:bg-gray-700'}"
						>
							{plan.cta}
						</a>
					{/if}
				</div>
			{/each}
		</div>
		<p class="mt-8 text-center text-xs text-gray-400">
			All plans include Stripe payment processing. Stripe charges 2.9% + 30¢ per transaction — we never take a cut.
		</p>
	</div>
</section>

<!-- FAQ -->
<section id="faq" class="bg-gray-50 px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="text-center mb-12">
			<h2 class="text-3xl font-bold text-gray-900 sm:text-4xl">Frequently asked questions</h2>
		</div>
		<div class="space-y-3">
			{#each faqs as faq, i (faq.q)}
				<div class="rounded-xl border border-gray-200 bg-white overflow-hidden">
					<button
						class="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
						onclick={() => openFaq = openFaq === i ? null : i}
					>
						{faq.q}
						<Icon
							icon="mdi:chevron-down"
							class="ml-4 h-5 w-5 shrink-0 text-gray-400 transition-transform {openFaq === i ? 'rotate-180' : ''}"
						/>
					</button>
					{#if openFaq === i}
						<div class="border-t border-gray-100 px-5 py-4 text-sm text-gray-500 leading-relaxed">
							{faq.a}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- CTA -->
<section class="bg-green-600 px-6 py-20">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Ready to take your first order?</h2>
		<p class="mt-4 text-green-100 text-lg">
			Set up your menu today — free, no credit card required.
		</p>
		<a
			href={loginHref}
			class="mt-8 inline-block rounded-xl bg-white px-10 py-3.5 text-base font-bold text-green-700 shadow-md hover:bg-green-50 transition-colors"
		>
			Create your free account
		</a>
	</div>
</section>

<!-- Footer -->
<footer class="border-t border-gray-200 bg-white px-6 py-10">
	<div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
		<p class="text-sm font-semibold text-gray-900">
			Order<span class="text-green-600">Local</span>
		</p>
		<p class="text-xs text-gray-400">© {new Date().getFullYear()} OrderLocal. All rights reserved.</p>
		<nav class="flex gap-4 text-xs text-gray-400">
			<a href={loginHref} class="hover:text-gray-700 transition-colors">Sign in</a>
			<a href="mailto:hello@orderlocal.app" rel="external" class="hover:text-gray-700 transition-colors">Contact</a>
		</nav>
	</div>
</footer>
