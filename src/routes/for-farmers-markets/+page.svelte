<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { track } from '$lib/analytics';
	import {
		Accordion,
		AccordionContent,
		AccordionItem,
		AccordionTrigger
	} from '$lib/components/ui/accordion';

	const loginHref = resolve('/login');

	let mobileMenuOpen = $state(false);
	let openFaq = $state<string | undefined>(undefined);

	const valueTiles = [
		{
			icon: 'mdi:cash-multiple',
			title: 'One way to pay, every time',
			desc: 'Customers pay upfront through Stripe when they order. You bring the goods — they bring the confirmation. No cash handling, no awkward change-making at a busy booth.'
		},
		{
			icon: 'mdi:package-check',
			title: 'Sell out cleanly',
			desc: 'Set a hard cap on how many of each item you\'re bringing. When you hit your limit, it shows sold out. No over-selling, no disappointing people at the booth who drove across town.'
		},
		{
			icon: 'mdi:account-heart-outline',
			title: 'Capture the customer',
			desc: 'Every order includes a name and email. Follow up with your newsletter, announce next week\'s menu, and build a list of people who already bought from you once.'
		}
	];

	const steps = [
		{
			num: '1',
			title: 'Build your weekly menu',
			desc: 'Add what you\'re bringing this week — products, photos, prices, and how many of each. Set your pickup window for market day.'
		},
		{
			num: '2',
			title: 'Share your link',
			desc: 'Post the link in your newsletter, Instagram, and neighborhood group. Customers order and pay before market day — you know exactly what to pack.'
		},
		{
			num: '3',
			title: 'Bring the list to your booth',
			desc: 'Pull up your orders on your phone. Hand off pre-paid items, mark them fulfilled, and focus your attention on walk-up customers.'
		}
	];

	const features = [
		{
			icon: 'mdi:calendar-clock-outline',
			title: 'Pickup windows for market day',
			desc: 'Set your window for Saturday 8am–1pm at the farmers market — or any location, any time. Customers see exactly when and where to pick up.'
		},
		{
			icon: 'mdi:counter',
			title: 'Inventory limits per item',
			desc: 'Bringing 24 jars of honey this week? Set the cap at 24. Orders stop when you hit your limit. No over-selling, no explaining at the booth.'
		},
		{
			icon: 'mdi:credit-card-outline',
			title: 'Stripe-powered checkout',
			desc: 'Customers pay when they order. Funds go straight to your bank — not ours. Standard Stripe processing fees only. No commissions.'
		},
		{
			icon: 'mdi:pause-circle-outline',
			title: 'Pause for the off-season',
			desc: 'Most farmers market vendors don\'t run 52 weeks. Pause your subscription when the season ends and resume it in the spring. No penalty, no lost data.'
		}
	];

	const faqs = [
		{
			q: 'My menu changes every week. Is that a problem?',
			a: 'No — you can add, hide, or edit items anytime from your dashboard. Many market vendors update their menu each week to reflect what they have available. Takes about two minutes.'
		},
		{
			q: 'Do I need to be at the market every week to use this?',
			a: 'No. You set your pickup windows yourself. If you skip a week or move to a new location, just update the window. Customers see the current schedule when they order.'
		},
		{
			q: 'Can I use this for multiple markets or pickup locations?',
			a: 'Yes. Market plan supports one pickup location. Pro plan supports multiple — useful if you sell at two or three different markets on different days.'
		},
		{
			q: 'What if a customer doesn\'t show up to collect their order?',
			a: 'Their payment was already collected at checkout through Stripe. You can mark the order as fulfilled or cancelled from your dashboard. We recommend your own policy for no-shows — most vendors keep the payment.'
		},
		{
			q: 'I sell at a market managed by someone else. Is there any coordination needed?',
			a: 'No. Order Local is your own ordering page — separate from any market management software. You handle your own pre-orders, the market runs the rest.'
		},
		{
			q: 'Can I pause in winter and pick up where I left off in spring?',
			a: 'Yes. Market and Pro plans can be paused anytime. When you resume, your menu, settings, and order history are all still there.'
		}
	];

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
	<title>Online Pre-Ordering for Farmers Market Vendors | Order Local</title>
	<meta
		name="description"
		content="Let customers pre-order from your farmers market booth before market day. Set inventory limits, pickup windows, and get paid through Stripe. Free to start."
	/>
	<meta
		property="og:title"
		content="Online Pre-Ordering for Farmers Market Vendors | Order Local"
	/>
	<meta
		property="og:description"
		content="Let customers pre-order from your farmers market booth before market day. Set inventory limits, pickup windows, and get paid through Stripe. Free to start."
	/>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html '<script type="application/ld+json">' + faqJsonLd + '<' + '/script>'}
</svelte:head>

<!-- Nav -->
<header class="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur">
	<div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
		<a
			href={resolve('/')}
			class="text-xl font-bold tracking-tight text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
		>
			Order<span class="text-primary">Local</span>
		</a>
		<nav class="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
			<a href="#how-it-works" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">How it works</a>
			<a href="#features" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Features</a>
			<a href="#pricing" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Pricing</a>
			<a href="#faq" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">FAQ</a>
		</nav>
		<div class="flex items-center gap-3">
			<a
				href={loginHref}
				class="hidden text-sm font-medium text-zinc-700 underline-offset-2 transition-colors hover:text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:inline"
			>
				Sign in
			</a>
			<a
				href={loginHref}
				onclick={() => track('cta_click', { location: 'header', page: 'for-farmers-markets' })}
				class="hidden rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:inline-block"
			>
				Start for free
			</a>
			<button
				aria-label="Open navigation menu"
				aria-expanded={mobileMenuOpen}
				aria-controls="mobile-menu"
				onclick={() => (mobileMenuOpen = true)}
				class="rounded-md p-2 text-zinc-700 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 md:hidden"
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
		onkeydown={(e) => { if (e.key === 'Escape') mobileMenuOpen = false; }}
	>
		<div class="flex items-center justify-between border-b px-6 py-4">
			<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
				Order<span class="text-primary">Local</span>
			</a>
			<button
				aria-label="Close navigation menu"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-md p-2 text-zinc-700 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
			>
				<Icon icon="mdi:close" class="h-5 w-5" />
			</button>
		</div>
		<nav class="flex flex-col gap-1 px-4 py-6 text-base font-medium">
			<a href="#how-it-works" onclick={() => (mobileMenuOpen = false)} class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">How it works</a>
			<a href="#features" onclick={() => (mobileMenuOpen = false)} class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Features</a>
			<a href="#pricing" onclick={() => (mobileMenuOpen = false)} class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Pricing</a>
			<a href="#faq" onclick={() => (mobileMenuOpen = false)} class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">FAQ</a>
		</nav>
		<div class="mt-auto flex flex-col gap-3 border-t px-4 py-6">
			<a href={loginHref} class="rounded-lg px-4 py-3 text-center text-sm font-medium text-zinc-700 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Sign in</a>
			<a href={loginHref} class="rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-white hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">Start for free</a>
		</div>
	</div>
{/if}

<!-- Hero -->
<section class="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background px-6 pt-24 pb-16">
	<div class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(22,163,74,0.08),transparent)]"></div>
	<div class="mx-auto max-w-3xl text-center">
		<span class="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase">
			Built for farmers market vendors
		</span>
		<h1 class="text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl">
			Pre-orders for your booth, finally simple.
		</h1>
		<p class="mt-6 text-lg leading-relaxed text-muted-foreground">
			Order Local gives farmers market vendors a pre-order page customers can shop before market day. Set inventory limits, accept Stripe payments, and walk in Saturday morning knowing exactly what you've sold.
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href={loginHref}
				onclick={() => track('cta_click', { location: 'hero', page: 'for-farmers-markets' })}
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
</section>

<!-- Value tiles -->
<section class="border-y bg-muted/40 px-6 py-16">
	<div class="mx-auto max-w-5xl">
		<div class="grid gap-8 sm:grid-cols-3">
			{#each valueTiles as tile (tile.title)}
				<div class="flex flex-col items-center text-center">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
						<Icon icon={tile.icon} class="h-6 w-6 text-primary" aria-hidden="true" />
					</div>
					<h2 class="font-semibold text-foreground">{tile.title}</h2>
					<p class="mt-2 text-sm leading-relaxed text-muted-foreground">{tile.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- How it works -->
<section id="how-it-works" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div class="mb-14 text-center">
			<span class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase">
				How it works
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Set it up before Tuesday. Take orders by Friday.
			</h2>
		</div>
		<div class="relative grid gap-10 sm:grid-cols-3">
			<div class="absolute inset-x-0 top-6 -z-10 hidden h-px border-t border-dashed border-zinc-300 sm:block"></div>
			{#each steps as step (step.num)}
				<div class="flex flex-col items-center text-center">
					<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-white shadow-md">
						{step.num}
					</div>
					<h3 class="font-semibold text-foreground">{step.title}</h3>
					<p class="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- Features -->
<section id="features" class="scroll-mt-20 bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-5xl">
		<div class="mb-14 text-center">
			<span class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase">
				What's included
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Built around the way market vendors work.
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2">
			{#each features as f (f.title)}
				<div class="flex gap-4 rounded-2xl border bg-background p-6 transition hover:border-emerald-200 hover:shadow-sm">
					<div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
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

<!-- Market manager callout -->
<section class="bg-primary/5 px-6 py-16">
	<div class="mx-auto max-w-2xl text-center">
		<div class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary">
			<Icon icon="mdi:handshake-outline" class="h-3.5 w-3.5" aria-hidden="true" />
			Market manager partnerships
		</div>
		<h2 class="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
			Are you a market manager in North Carolina?
		</h2>
		<p class="mt-3 text-base leading-relaxed text-gray-700">
			We're building relationships with NC farmers markets to help vendors get set up quickly. If you manage a market and want to offer pre-ordering to your vendors, reach out — we'll make it simple.
		</p>
		<a
			href="mailto:hello@getorderlocal.com"
			rel="external"
			onclick={() => track('cta_click', { location: 'market_manager_callout', page: 'for-farmers-markets' })}
			class="mt-7 inline-block rounded-xl border border-primary/40 bg-background px-8 py-3.5 text-base font-semibold text-primary shadow-sm transition-colors hover:bg-primary/5"
		>
			Get in touch
		</a>
	</div>
</section>

<!-- Founding vendor callout -->
<section class="bg-amber-50 px-6 py-16">
	<div class="mx-auto max-w-2xl text-center">
		<div class="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-semibold text-amber-800">
			<Icon icon="mdi:fire" class="h-3.5 w-3.5" aria-hidden="true" />
			Founding vendor offer — first 25 only
		</div>
		<h2 class="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
			Lock in Market at $19/mo — for life.
		</h2>
		<p class="mt-3 text-base leading-relaxed text-gray-700">
			We're signing up our first 25 market vendor partners at a founding rate. You get the full Market plan — pickup windows, inventory limits, cutoff times, and Stripe checkout — locked at $19/mo for as long as you stay active.
		</p>
		<p class="mt-2 text-sm text-amber-700">
			Market normally lists at $29/mo. This rate never increases.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'founding_callout', page: 'for-farmers-markets' })}
			class="mt-7 inline-block rounded-xl bg-amber-600 px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-amber-700"
		>
			Claim your founding spot
		</a>
		<p class="mt-3 text-xs text-gray-500">No credit card required to start. Cancel anytime.</p>
	</div>
</section>

<!-- Pricing -->
<section id="pricing" class="scroll-mt-20 bg-background px-6 py-24">
	<div class="mx-auto max-w-4xl">
		<div class="mb-10 text-center">
			<span class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase">
				Pricing
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Start free. Upgrade when you're ready.
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">No commissions. Keep 100% of your sales.</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<!-- Starter -->
			<div class="flex flex-col overflow-hidden rounded-2xl border bg-background">
				<div class="flex flex-1 flex-col p-7">
					<p class="text-lg font-bold text-foreground">Starter</p>
					<p class="mt-1 text-sm text-muted-foreground">Try it out — take your first pre-orders for free.</p>
					<div class="mt-5 flex items-end gap-x-2">
						<span class="text-4xl font-bold text-foreground">Free</span>
					</div>
					<ul class="mt-6 flex-1 space-y-2.5">
						{#each ['Up to 10 menu items', 'Online ordering & payments', 'Order management dashboard', 'Customer email receipts', 'Menu QR code', 'Standard Stripe fees only (2.9% + 30¢)'] as feat (feat)}
							<li class="flex items-start gap-2 text-sm text-muted-foreground">
								<Icon icon="mdi:check-circle-outline" class="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
								{feat}
							</li>
						{/each}
					</ul>
					<a
						href={loginHref}
						onclick={() => track('cta_click', { location: 'pricing_starter', page: 'for-farmers-markets' })}
						class="mt-8 block rounded-xl bg-gray-900 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-gray-700"
					>
						Start for free
					</a>
				</div>
			</div>

			<!-- Market -->
			<div class="relative flex flex-col overflow-hidden rounded-2xl border border-primary shadow-2xl ring-2 ring-primary/20">
				<div class="absolute -top-3 left-0 right-0 flex justify-center">
					<span class="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm">Best for market vendors</span>
				</div>
				<div class="h-1 bg-primary"></div>
				<div class="flex flex-1 flex-col p-7">
					<p class="text-lg font-bold text-foreground">Market</p>
					<p class="mt-1 text-sm text-muted-foreground">For vendors who sell regularly and want the full toolkit.</p>
					<div class="mt-5 flex items-end gap-x-2">
						<span class="text-4xl font-bold text-foreground">$29</span>
						<span class="mb-1 text-sm text-muted-foreground">/ month</span>
					</div>
					<ul class="mt-6 flex-1 space-y-2.5">
						{#each ['Everything in Starter', 'Up to 30 menu items', 'Pickup windows & cutoff times', 'Inventory limits per item', 'Single pickup location', 'Eligible for select add-ons', 'Standard Stripe fees only'] as feat (feat)}
							<li class="flex items-start gap-2 text-sm text-muted-foreground">
								<Icon icon="mdi:check-circle-outline" class="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
								{feat}
							</li>
						{/each}
					</ul>
					<a
						href={loginHref}
						onclick={() => track('cta_click', { location: 'pricing_market', page: 'for-farmers-markets' })}
						class="mt-8 block rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90"
					>
						Start free trial
					</a>
				</div>
			</div>
		</div>

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Need multiple locations or unlimited items? See our <a href={resolve('/') + '#pricing'} class="text-primary underline underline-offset-2 hover:text-primary/80">Pro plan</a>.
		</p>
	</div>
</section>

<!-- FAQ -->
<section id="faq" class="scroll-mt-20 bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-12 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Questions from market vendors</h2>
		</div>
		<Accordion
			type="single"
			bind:value={openFaq}
			class="space-y-3"
			onValueChange={(v: string | undefined) => {
				if (v !== undefined) track('faq_open', { question: faqs[+v]?.q, page: 'for-farmers-markets' });
			}}
		>
			{#each faqs as faq, i (faq.q)}
				<AccordionItem
					value={String(i)}
					class="overflow-hidden rounded-xl border bg-background not-last:border-b"
				>
					<AccordionTrigger
						class="px-5 py-4 text-sm font-semibold text-foreground hover:bg-muted/50 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
<section class="bg-primary/95 px-6 py-20">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Saturday morning, sorted.</h2>
		<p class="mt-4 text-lg text-primary-foreground/80">
			Set up your pre-order page this week. Free to start, no credit card required.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'final_banner', page: 'for-farmers-markets' })}
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
					<a href={resolve('/')} class="transition-colors hover:text-foreground">Home</a>
					<a href={resolve('/') + '#pricing'} class="transition-colors hover:text-foreground">Pricing</a>
					<a href={loginHref} class="transition-colors hover:text-foreground">Sign in</a>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Solutions</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/for-bakeries')} class="transition-colors hover:text-foreground">For Bakeries</a>
					<a href={resolve('/for-farmers-markets')} class="transition-colors hover:text-foreground">For Farmers Markets</a>
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
				<a href="https://x.com/getorderlocal" target="_blank" rel="noopener noreferrer" aria-label="Order Local on X" class="text-muted-foreground transition-colors hover:text-foreground">
					<Icon icon="mdi:twitter" class="h-4 w-4" aria-hidden="true" />
				</a>
				<a href="https://linkedin.com/company/getorderlocal" target="_blank" rel="noopener noreferrer" aria-label="Order Local on LinkedIn" class="text-muted-foreground transition-colors hover:text-foreground">
					<Icon icon="mdi:linkedin" class="h-4 w-4" aria-hidden="true" />
				</a>
			</div>
		</div>
	</div>
</footer>
