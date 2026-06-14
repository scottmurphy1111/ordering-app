<script lang="ts">
	import { resolve } from '$app/paths';
	import { pushState } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import { track } from '$lib/analytics';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';
	import { TIERS, ADDONS, type TierKey } from '$lib/billing';

	const loginHref = resolve('/login');

	// Marketing-only per-tier copy. Objective product data (prices, features,
	// item limits) lives in $lib/billing as the canonical source.
	const taglines: Record<TierKey, string> = {
		starter: 'Try it out, take your first orders.',
		growth: 'Room to grow as your orders pick up.',
		market: 'For booth vendors, market sellers, and side-hustle makers.',
		pro: 'The full toolkit for shops, bakeries, and growing businesses.'
	};
	const highlightTier: TierKey = 'growth';

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
		{ icon: 'mdi:tent', label: 'Market booth operators', path: undefined },
		{ icon: 'mdi:flower-outline', label: 'Florists', path: undefined },
		{ icon: 'mdi:package-variant-closed', label: 'CSA boxes', path: undefined },
		{ icon: 'mdi:truck-outline', label: 'Food trucks', path: undefined },
		{ icon: 'mdi:coffee-outline', label: 'Coffee shops', path: undefined },
		{ icon: 'mdi:room-service-outline', label: 'Caterers', path: undefined },
		{ icon: 'mdi:star-outline', label: 'Specialty vendors', path: undefined },
		{ icon: 'mdi:hanger', label: 'Boutique shops', path: undefined }
	];

	const whyOrderLocal = [
		{
			icon: 'mdi:check-decagram-outline',
			title: 'Fewer mistakes',
			desc: 'Every order comes in structured — item, options, pickup time. Nothing lost in a DM thread.'
		},
		{
			icon: 'mdi:clipboard-check-outline',
			title: 'Less chaos on market day',
			desc: 'One list, totaled and sorted, on your phone — not a stack of paper order sheets.'
		},
		{
			icon: 'mdi:timer-sand',
			title: 'Sell items before market day',
			desc: 'Set a cutoff and a cap, and customers reserve in advance instead of crowding the booth.'
		},
		{
			icon: 'mdi:shimmer',
			title: 'Look more professional',
			desc: 'A branded page of your own — instead of "DM me to order" and a Google Form link.'
		}
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
			desc: 'Set your colors, fonts, and background patterns, and add a banner — upload your own or generate one with AI. Your storefront feels like your business, not a templated landing page.'
		},
		{
			icon: 'mdi:tune-variant',
			title: 'Options and add-ons',
			desc: 'Let customers choose sizes, flavors, and extras — each priced the way you set it. From a single jar to a customized cake, they build exactly what they want.'
		},
		{
			icon: 'mdi:qrcode',
			title: 'Reach customers everywhere',
			desc: 'Your own link where customers order directly, and a QR code for the booth — so wherever they find you, they can buy.'
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
			desc: 'Revenue trends, top items, and peak hours — with custom date ranges and CSV export on the Advanced Analytics add-on.'
		},
		{
			icon: 'mdi:cog-refresh-outline',
			title: 'Flexible billing',
			desc: 'Change plans anytime. Add a feature for the holidays, drop it after. No yearly contracts, no surprise renewals.'
		}
	];

	type ComparisonRow = {
		label: string;
		them: string;
		us: string;
	};

	const comparison: ComparisonRow[] = [
		{
			label: 'Built for',
			them: 'Shipping thousands of products nationwide',
			us: 'Local pickup for what you make by hand'
		},
		{
			label: 'Time to your first order',
			them: 'A week of setup — themes, shipping zones, carriers, add-ons',
			us: 'Live in an afternoon'
		},
		{
			label: 'Cost to start',
			them: 'A monthly fee from day one, whether you sell or not',
			us: 'Free to start, up to 5 items'
		},
		{
			label: 'The real bill',
			them: 'The plan, plus a stack of paid apps to fill the gaps',
			us: 'Everything you need to get up and running, included'
		},
		{
			label: 'Learning curve',
			them: 'So much to manage they give you an AI assistant to help you through it',
			us: "Simple enough that you won't need one"
		},
		{
			label: "Who it's for",
			them: '"Merchants" managing "SKUs" and "fulfillment"',
			us: 'Makers, bakers, and growers running their own businesses'
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
			a: 'No. Customers order from any phone or laptop browser — just share your link or QR code.'
		},
		{
			q: 'What happens when I hit 5 items on the Starter plan?',
			a: 'Upgrade to Growth ($24/mo) for 20 items, Market ($49/mo) for 50, or Pro ($99/mo) for unlimited. Your existing catalog and orders carry over.'
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

	let pricingInterval = $state<'monthly' | 'annual'>('monthly');
	let mobileMenuOpen = $state(false);

	function openMobileMenu() {
		mobileMenuOpen = true;
		// Add a history entry (SvelteKit shallow routing) so the device/browser back
		// button closes the menu instead of navigating away. Raw history.pushState is
		// avoided here because it interferes with SvelteKit's own history tracking.
		pushState('', { mobileMenu: true });
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
		// Pop the entry we added on open so history stays clean.
		if (page.state.mobileMenu) history.back();
	}

	// Back button pops the pushed entry, clearing page.state.mobileMenu → close the
	// menu. Open state is kept local (not derived from page.state) so that paging
	// back past the entry later never re-opens the menu.
	$effect(() => {
		if (!page.state.mobileMenu) mobileMenuOpen = false;
	});

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
	<link rel="preload" as="image" href="/marketing/iStock-958138908.webp" />
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
				onclick={openMobileMenu}
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
			if (e.key === 'Escape') closeMobileMenu();
		}}
	>
		<div class="flex items-center justify-between border-b px-6 py-4">
			<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
				Order<span class="text-primary">Local</span>
			</a>
			<button
				type="button"
				aria-label="Close navigation menu"
				onclick={closeMobileMenu}
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
	class="flex items-center bg-cover bg-center bg-no-repeat px-6 py-24 md:py-48"
	style="background-image: linear-gradient(rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0.75)), url('/marketing/iStock-958138908.webp');	  background-size: cover;
			background-position: 60% 40%;
			background-repeat: no-repeat;"
>
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(22,163,74,0.08),transparent)]"
	></div>
	<div class="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
		<!-- Text -->
		<div class="flex flex-col items-center text-center">
			<span
				class="mb-6 inline-block rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold tracking-widest text-background/90 uppercase"
			>
				Built for makers, bakers, and growers
			</span>
			<!-- Headline alternates the owner may swap in verbatim:
			     "Look professional. Sell more. Get paid faster."
			     "Give your customers a better way to order from you." -->
			<h1
				class="w-full max-w-[24ch] text-4xl leading-tight font-bold tracking-tight text-balance text-background sm:text-5xl"
			>
				The simple way to take pre-orders from your customers.
			</h1>
			<p class="mt-6 w-full max-w-lg text-lg leading-relaxed text-background/90">
				Order Local gives sellers like you a branded page of their own: products organized,
				pre-orders and payments handled, every order in one place. Set up in minutes. Powered by
				Stripe
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
					class="w-full rounded-xl border bg-background px-8 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted/90 sm:w-auto"
				>
					See how it works
				</a>
			</div>
			<p class="mt-4 text-xs text-background/70">
				No credit card to start · Free plan available · Keep 100% of your sales (Stripe fees apply)
			</p>
		</div>

		<!-- Dashboard mock -->
		<div class="relative mx-auto w-full max-w-lg pr-2 pb-10">
			<div
				class="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-primary/5 blur-2xl"
			></div>
			<div class="relative isolate overflow-hidden rounded-2xl border bg-background shadow-2xl">
				<span class="hero-gleam" aria-hidden="true"></span>
				<!-- Browser chrome -->
				<div class="flex items-center gap-1.5 border-b bg-muted/60 px-3 py-2.5">
					<div class="h-2.5 w-2.5 rounded-full bg-red-400/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-yellow-400/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-green-400/70"></div>
					<div
						class="ml-2 flex-1 rounded-md bg-background px-2 py-0.5 text-[10px] text-muted-foreground/70"
					>
						sunrise-bakery.getorderlocal.com/dashboard
					</div>
				</div>
				<!-- Dashboard layout -->
				<div class="flex">
					<!-- Sidebar -->
					<div class="flex w-28 shrink-0 flex-col bg-gray-900 px-2 py-3">
						<p class="mb-3 px-2 text-[10px] font-bold text-white">Sunrise Bakery</p>
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
								{#each [{ num: '#142', items: 'Sourdough ×2, Honey', status: 'New', color: 'bg-blue-100 text-blue-700' }, { num: '#141', items: 'Croissants x8', status: 'Preparing', color: 'bg-yellow-100 text-yellow-700' }, { num: '#140', items: 'Rye loaf, Jam', status: 'Ready', color: 'bg-green-100 text-green-700' }] as order (order.num)}
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
				<span class="hero-gleam hero-gleam--delayed" aria-hidden="true"></span>
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
				<!-- storefront banner -->
				<div
					class="h-12 w-full bg-cover bg-center"
					style="background-image: url('https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=120&fit=crop&q=80')"
					aria-hidden="true"
				></div>
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
					{#each [{ name: 'Sourdough Loaf', desc: 'Saturday pickup only', price: '$12.00', img: 'https://images.unsplash.com/photo-1586444248902-2f64eddc13df?w=80&h=80&fit=crop&q=80' }, { name: 'Rye Loaf', desc: 'Pre-sliced available', price: '$11.00', img: 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=80&h=80&fit=crop&q=80' }, { name: 'Croissant ×6', desc: 'Order by Thu 8pm', price: '$18.00', img: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=80&h=80&fit=crop&q=80' }] as item (item.name)}
						<div class="flex items-center justify-between gap-2 py-2">
							<div class="flex items-center gap-1.5">
								<div
									class="h-8 w-8 shrink-0 rounded-lg bg-cover bg-center"
									style="background-image: url('{item.img}')"
								></div>
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

<!-- Why Order Local -->
<section class="bg-background px-6 py-24">
	<div class="mx-auto max-w-5xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Why Order Local
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Replace the order-day scramble.
			</h2>
			<p class="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
				Right now your orders live in DMs, a spreadsheet, a paper sheet at the booth, and a Google
				Form you keep re-sharing. Order Local puts all of it in one place.
			</p>
		</div>
		<div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
			{#each whyOrderLocal as item (item.title)}
				<div class="flex flex-col items-center text-center">
					<div class="mb-4 flex items-center justify-center">
						<Icon icon={item.icon} class="h-10 w-10 text-primary/90" aria-hidden="true" />
					</div>
					<h3 class="font-semibold text-foreground">{item.title}</h3>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Storefront features -->
<section id="features" class="scroll-mt-20 bg-background px-6 pb-24 md:py-24">
	<div class="mx-auto max-w-6xl">
		<div class="-mx-6 mb-12 overflow-hidden md:mx-auto md:rounded-2xl">
			<img
				src="/marketing/iStock-1369508999.webp"
				alt="Overhead view of a market stall with a variety of baked goods on display"
				class="h-64 w-full object-cover md:h-72 lg:h-96"
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
		<div class="grid gap-6 sm:grid-cols-2">
			{#each storefrontFeatures as f (f.title)}
				<div
					class="flex gap-4 rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div
						class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
					>
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground">{f.title}</h3>
						<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Operations features -->
<section class="scroll-mt-20 bg-emerald-100/30 px-6 pb-24 md:py-24">
	<div class="mx-auto max-w-6xl">
		<div class="-mx-6 mb-12 overflow-hidden md:mx-auto md:rounded-2xl">
			<img
				src="/marketing/iStock-1334132701.webp"
				alt="Florist's workspace — fresh flowers, ribbon, and tools laid out on a wooden floor"
				class="h-64 w-full object-cover md:h-72 lg:h-96"
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
					class="flex gap-4 rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div
						class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
					>
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground">{f.title}</h3>
						<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Growth features -->
<section class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1.4fr] lg:items-start lg:gap-16">
		<div class="lg:top-28">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Grow what's working
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Tools to grow as your business does.
			</h2>
			<p class="mt-4 text-lg leading-relaxed text-muted-foreground">
				Start simple and turn these on as you grow — no replatforming, no contracts.
			</p>
		</div>
		<div class="space-y-4">
			{#each growthFeatures as f (f.title)}
				<div
					class="flex gap-4 rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div
						class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
					>
						<Icon icon={f.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<h3 class="font-semibold text-foreground">{f.title}</h3>
						<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section id="how-it-works" class="scroll-mt-20 bg-muted px-6 pb-24 md:py-24">
	<div class="mx-auto max-w-6xl">
		<div class="-mx-6 mb-12 overflow-hidden md:mx-auto md:rounded-2xl">
			<img
				src="/marketing/iStock-2241575917.webp"
				alt="Freshly baked brown bread in a wicker basket"
				class="h-64 w-full object-cover md:h-72 lg:h-96"
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
				Create your store — up and running in minutes.
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

<!-- Comparison -->
<section class="relative isolate overflow-hidden bg-gray-900 px-6 py-24">
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,rgba(22,163,74,0.18),transparent)]"
		aria-hidden="true"
	></div>
	<div class="mx-auto max-w-5xl">
		<div class="mb-14 text-center">
			<h2 class="text-3xl font-bold text-white sm:text-4xl">Built for what you actually do.</h2>
			<p class="mx-auto mt-3 max-w-2xl text-lg text-gray-300">
				The big platforms are built to ship parcels worldwide. Order Local is built for the way you
				really sell — by hand, to people nearby, for pickup.
			</p>
		</div>

		<!-- Mobile: vertical stack of per-row cards -->
		<div class="space-y-4 md:hidden">
			{#each comparison as row (row.label)}
				<div class="rounded-2xl border bg-background p-6">
					<p class="text-sm font-semibold text-foreground">{row.label}</p>
					<div class="mt-4 space-y-4">
						<div>
							<p class="text-xs font-medium tracking-wide text-muted-foreground/70 uppercase">
								The all-in-one platforms
							</p>
							<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{row.them}</p>
						</div>
						<div class="rounded-xl bg-primary/5 p-3">
							<p class="text-xs font-medium tracking-wide text-primary/90 uppercase">Order Local</p>
							<p class="mt-1 text-sm leading-relaxed font-medium text-foreground">{row.us}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop: 3-column comparison grid -->
		<div
			class="hidden overflow-hidden rounded-2xl border bg-background md:grid md:grid-cols-[1.2fr_2fr_2fr]"
		>
			<!-- Header row -->
			<div class="bg-muted/30 px-8 py-5"></div>
			<div class="bg-muted/30 px-8 py-5">
				<p class="text-sm font-semibold text-muted-foreground">The all-in-one platforms</p>
			</div>
			<div class="bg-primary/5 px-8 py-5">
				<p class="text-sm font-semibold text-primary">Order Local</p>
			</div>

			<!-- Comparison rows -->
			{#each comparison as row (row.label)}
				<div class="border-t px-8 py-5">
					<p class="text-sm font-semibold text-foreground">{row.label}</p>
				</div>
				<div class="border-t px-8 py-5">
					<p class="text-sm leading-relaxed text-muted-foreground">{row.them}</p>
				</div>
				<div class="border-t bg-primary/5 px-8 py-5">
					<p class="text-sm leading-relaxed font-medium text-foreground">{row.us}</p>
				</div>
			{/each}
		</div>

		<p class="mt-10 text-center text-sm text-gray-300">
			You don't need a bigger toolbox. You need the right one.
		</p>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-4xl">
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

		<!-- 4-tier grid -->
		<div class="mt-10 grid items-start gap-6 sm:grid-cols-2">
			{#each TIERS as tier (tier.key)}
				{@const isHighlight = tier.key === highlightTier}
				{@const hasAnnual = 'annualMonthly' in tier}
				<div class="relative flex h-full flex-col {isHighlight ? 'lg:scale-101' : ''}">
					{#if isHighlight}
						<div class="absolute -top-3 right-0 left-0 flex justify-center">
							<Badge class="bg-primary text-primary-foreground shadow-sm">Most popular</Badge>
						</div>
					{/if}
					<div
						class="flex flex-1 flex-col overflow-hidden rounded-2xl border {isHighlight
							? 'border-primary shadow-2xl ring-2 ring-primary/20'
							: 'bg-background'} "
					>
						{#if isHighlight}
							<div class="h-1 bg-primary"></div>
						{/if}
						<div class="flex flex-1 flex-col p-7">
							<p class="text-lg font-bold text-foreground">{tier.name}</p>
							<p class="mt-1 text-sm text-muted-foreground">{taglines[tier.key]}</p>

							<!-- Price -->
							<div class="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1">
								{#if tier.price === 0}
									<span class="text-4xl font-bold text-foreground">Free</span>
								{:else if pricingInterval === 'monthly' || !hasAnnual}
									<span class="text-4xl font-bold text-foreground">${tier.price}</span>
									<span class="mb-1 text-sm text-muted-foreground">/ month</span>
								{:else}
									<span class="text-4xl font-bold text-foreground">${tier.annualTotal}</span>
									<span class="mb-1 text-sm text-muted-foreground">/ year</span>
									<span
										class="mb-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
										>Save ${tier.annualSavings}/yr</span
									>
								{/if}
							</div>

							<ul class="mt-6 flex-1 space-y-2.5">
								{#each tier.features as feat (feat)}
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
								onclick={() => track('cta_click', { location: `pricing_${tier.key}` })}
								class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold transition-colors {isHighlight
									? 'bg-primary text-white hover:bg-primary/90'
									: 'bg-gray-900 text-white hover:bg-gray-700'}"
							>
								Get started
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
<section class="bg-emerald-100/30 px-6 py-24">
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
			{#each ADDONS as addon (addon.key)}
				<div
					class="flex gap-4 rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm"
				>
					<div
						class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
					>
						<Icon icon={addon.icon} class="h-5 w-5 text-primary" aria-hidden="true" />
					</div>
					<div>
						<div class="flex flex-wrap items-center gap-2">
							<h3 class="font-semibold text-foreground">{addon.name}</h3>
							<span
								class="rounded-full border bg-background px-1.5 py-0.5 text-xs font-semibold text-muted-foreground"
								>${addon.price}/mo</span
							>
						</div>
						<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{addon.description}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- FAQ -->
<section id="faq" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-12 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Frequently asked questions</h2>
		</div>
		<Accordion type="multiple" class="space-y-3">
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
					<AccordionContent
						class="border-t px-5 py-2.5 text-sm leading-relaxed text-muted-foreground"
					>
						{faq.a}
					</AccordionContent>
				</AccordionItem>
			{/each}
		</Accordion>
	</div>
</section>

<!-- Closing CTA -->
<section
	class="relative overflow-hidden bg-primary px-6 py-32 md:py-48"
	style="
		background-image:
			linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)),
			url('/marketing/iStock-810850844.webp');
		background-size: cover;
		background-position: 50% 50%;
	"
>
	<div class="mx-auto max-w-3xl rounded-xl px-10 py-12 text-center">
		<h2 class="text-3xl font-bold text-white text-shadow-lg sm:text-4xl">
			Ready to take your first order?
		</h2>
		<p class="mt-4 text-lg font-semibold text-primary-foreground text-shadow-md">
			Set up your page today. Free, no credit card required.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'final_banner' })}
			class="mt-8 inline-block rounded-xl bg-background px-10 py-3.5 text-base font-bold text-primary/90 shadow-lg transition-colors hover:bg-white/90"
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
			<div class="text-center sm:text-left">
				<p class="text-xs text-muted-foreground">
					© {new Date().getFullYear()} Order<span class="text-primary">Local</span>. All rights
					reserved.
				</p>
				<p class="mt-1 text-xs text-muted-foreground">
					We'll never sell your personal data. <a
						href={resolve('/privacy')}
						class="underline transition-colors hover:text-foreground">Privacy Policy</a
					>
				</p>
			</div>
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

<style>
	.hero-gleam {
		position: absolute;
		inset: 0;
		z-index: 20;
		pointer-events: none;
		border-radius: inherit;
		overflow: hidden;
	}
	.hero-gleam::after {
		content: '';
		position: absolute;
		top: -60%;
		left: -75%;
		width: 45%;
		height: 220%;
		background: linear-gradient(
			100deg,
			transparent 0%,
			rgba(255, 255, 255, 0) 40%,
			rgba(255, 255, 255, 0.5) 50%,
			rgba(255, 255, 255, 0) 60%,
			transparent 100%
		);
		transform: rotate(8deg) translateX(-120%);
		animation: hero-gleam-sweep 7.5s ease-in-out infinite;
	}
	/* phone gleam follows the dashboard by ~0.8s */
	.hero-gleam--delayed::after {
		animation: hero-gleam-sweep-phone 7.5s ease-in-out infinite 0.55s;
	}
	@keyframes hero-gleam-sweep {
		0% {
			transform: rotate(8deg) translateX(-120%);
		}
		24% {
			transform: rotate(8deg) translateX(390%);
		}
		100% {
			transform: rotate(8deg) translateX(390%); /* rest off-screen until next cycle */
		}
	}

	@keyframes hero-gleam-sweep-phone {
		0% {
			transform: rotate(8deg) translateX(-120%);
		}
		17% {
			transform: rotate(8deg) translateX(390%);
		}
		100% {
			transform: rotate(8deg) translateX(390%); /* rest off-screen until next cycle */
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hero-gleam::after {
			animation: none;
		}
	}
</style>
