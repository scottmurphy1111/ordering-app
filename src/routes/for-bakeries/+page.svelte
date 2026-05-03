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
			icon: 'mdi:calendar-star',
			title: 'Holiday pre-orders, handled',
			desc: 'Open your Thanksgiving pie window in October. Set a cutoff date, cap the total orders, and let customers reserve theirs — without a single text message from you.'
		},
		{
			icon: 'mdi:format-list-checks',
			title: 'Custom orders, built right in',
			desc: 'Modifiers for size, flavor, filling, and inscription. Customers configure exactly what they want at checkout, and you see every detail when you pull the order.'
		},
		{
			icon: 'mdi:clock-time-four-outline',
			title: 'Pickup windows that fit your schedule',
			desc: "Friday afternoons. Saturday market. Holiday-only slots. Set when you're open, close the window when you're full, and never over-promise again."
		}
	];

	const steps = [
		{
			num: '1',
			title: 'Set up your catalog',
			desc: 'Add your products, photos, prices, and modifier options — sizes, flavors, fillings. Set inventory caps and pickup windows.'
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
	];

	const features = [
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
	];

	const faqs = [
		{
			q: 'Can I use this just for holiday pre-orders and not year-round?',
			a: 'Yes. Many bakeries use Order Local seasonally — open their Thanksgiving window in October, run it through the holiday, then pause until the next season. You can pause Market and Pro plans any time.'
		},
		{
			q: 'How do customers specify custom details like inscription or flavor?',
			a: 'Through modifiers. You set up the options (flavor, size, filling, inscription text) and customers fill them in during checkout. Every detail shows up on the order — no follow-up needed.'
		},
		{
			q: 'What happens when I sell out?',
			a: 'Set an inventory limit on any item. Once that number is hit, the item shows as sold out and no more orders come through. No awkward calls to customers who ordered after you were full.'
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
			a: 'Pickup windows, cutoff times, and inventory limits are available on Market ($29/mo) and Pro. Modifiers are available on all plans, including the free Starter plan.'
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
	<title>Online Ordering for Bakeries — Pre-Orders, Pickup, and Custom Cakes | Order Local</title>
	<meta
		name="description"
		content="Take bakery pre-orders online. Set holiday windows, custom modifiers, pickup cutoffs, and inventory limits. Powered by Stripe. No commissions. Free to start."
	/>
	<meta
		property="og:title"
		content="Online Ordering for Bakeries — Pre-Orders, Pickup, and Custom Cakes | Order Local"
	/>
	<meta
		property="og:description"
		content="Take bakery pre-orders online. Set holiday windows, custom modifiers, pickup cutoffs, and inventory limits. Powered by Stripe. No commissions. Free to start."
	/>
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
				href="#how-it-works"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>How it works</a
			>
			<a
				href="#features"
				class="transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Features</a
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
				onclick={() => track('cta_click', { location: 'header', page: 'for-bakeries' })}
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
				href="#how-it-works"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>How it works</a
			>
			<a
				href="#features"
				onclick={() => (mobileMenuOpen = false)}
				class="rounded-lg px-4 py-3 text-zinc-700 hover:bg-muted hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
				>Features</a
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
	class="relative overflow-hidden bg-gradient-to-b from-amber-50/60 to-background px-6 pt-24 pb-16"
>
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,191,36,0.10),transparent)]"
	></div>
	<div class="mx-auto max-w-3xl text-center">
		<span
			class="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
		>
			Built for bakeries
		</span>
		<h1 class="text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl">
			Stop taking cake orders by text.
		</h1>
		<p class="mt-6 text-lg leading-relaxed text-muted-foreground">
			Order Local gives your bakery a branded pre-order page — with pickup windows, holiday cutoffs,
			custom modifiers, and Stripe payments built in. Set it up once, and let it take orders while
			you bake.
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<a
				href={loginHref}
				onclick={() => track('cta_click', { location: 'hero', page: 'for-bakeries' })}
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
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				How it works
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Up and running before your next holiday rush.
			</h2>
		</div>
		<div class="relative grid gap-10 sm:grid-cols-3">
			<div
				class="absolute inset-x-0 top-6 -z-10 hidden h-px border-t border-dashed border-zinc-300 sm:block"
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

<!-- Features -->
<section id="features" class="scroll-mt-20 bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-5xl">
		<div class="mb-14 text-center">
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				What's included
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Everything a bakery actually needs.
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2">
			{#each features as f (f.title)}
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

<!-- Founding bakery callout -->
<section class="bg-amber-50 px-6 py-16">
	<div class="mx-auto max-w-2xl text-center">
		<div
			class="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-4 py-1.5 text-xs font-semibold text-amber-800"
		>
			<Icon icon="mdi:fire" class="h-3.5 w-3.5" aria-hidden="true" />
			Founding bakery offer — first 25 only
		</div>
		<h2 class="mt-5 text-2xl font-bold text-gray-900 sm:text-3xl">
			Lock in Pro at $49/mo — for life.
		</h2>
		<p class="mt-3 text-base leading-relaxed text-gray-700">
			We're signing up our first 25 bakery partners at a founding rate. You get the full Pro plan —
			unlimited items, multiple pickup locations, website embed, priority support — locked at $49/mo
			as long as you stay active.
		</p>
		<p class="mt-2 text-sm text-amber-700">
			Pro normally lists at $79/mo. This rate never increases.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'founding_callout', page: 'for-bakeries' })}
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
			<span
				class="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				Pricing
			</span>
			<h2 class="mt-3 text-3xl font-bold text-foreground sm:text-4xl">
				Simple pricing. No commissions.
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				Keep 100% of your sales. Pay only Stripe's standard processing fee.
			</p>
		</div>

		<div class="grid gap-6 sm:grid-cols-2">
			<!-- Market -->
			<div class="flex flex-col overflow-hidden rounded-2xl border bg-background">
				<div class="flex flex-1 flex-col p-7">
					<p class="text-lg font-bold text-foreground">Market</p>
					<p class="mt-1 text-sm text-muted-foreground">
						For growing bakeries taking regular pre-orders.
					</p>
					<div class="mt-5 flex items-end gap-x-2">
						<span class="text-4xl font-bold text-foreground">$29</span>
						<span class="mb-1 text-sm text-muted-foreground">/ month</span>
					</div>
					<ul class="mt-6 flex-1 space-y-2.5">
						{#each ['Up to 30 catalog items', 'Pickup windows & cutoff times', 'Inventory limits per item', 'Online ordering & Stripe checkout', 'Customer email receipts', 'Catalog QR code', 'Standard Stripe fees only (2.9% + 30¢)'] as feat (feat)}
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
						onclick={() => track('cta_click', { location: 'pricing_market', page: 'for-bakeries' })}
						class="mt-8 block rounded-xl bg-gray-900 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-gray-700"
					>
						Start free trial
					</a>
				</div>
			</div>

			<!-- Pro -->
			<div
				class="relative flex flex-col overflow-hidden rounded-2xl border border-primary shadow-2xl ring-2 ring-primary/20"
			>
				<div class="absolute -top-3 right-0 left-0 flex justify-center">
					<span class="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white shadow-sm"
						>Most popular for bakeries</span
					>
				</div>
				<div class="h-1 bg-primary"></div>
				<div class="flex flex-1 flex-col p-7">
					<p class="text-lg font-bold text-foreground">Pro</p>
					<p class="mt-1 text-sm text-muted-foreground">
						The full toolkit for established bakeries and holiday volume.
					</p>
					<div class="mt-5 flex items-end gap-x-2">
						<span class="text-4xl font-bold text-foreground">$79</span>
						<span class="mb-1 text-sm text-muted-foreground">/ month</span>
					</div>
					<ul class="mt-6 flex-1 space-y-2.5">
						{#each ['Everything in Market', 'Unlimited catalog items', 'Multiple pickup locations', 'Website embed', 'Priority support', 'Eligible for all add-ons', 'Standard Stripe fees only'] as feat (feat)}
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
						onclick={() => track('cta_click', { location: 'pricing_pro', page: 'for-bakeries' })}
						class="mt-8 block rounded-xl bg-primary px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-primary/90"
					>
						Get started
					</a>
				</div>
			</div>
		</div>

		<p class="mt-6 text-center text-sm text-muted-foreground">
			Not sure? Start free on our <a
				href={loginHref}
				class="text-primary underline underline-offset-2 hover:text-primary/80">Starter plan</a
			> — up to 10 items, no credit card required.
		</p>
	</div>
</section>

<!-- FAQ -->
<section id="faq" class="scroll-mt-20 bg-muted/50 px-6 py-24">
	<div class="mx-auto max-w-2xl">
		<div class="mb-12 text-center">
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">Questions from bakery owners</h2>
		</div>
		<Accordion
			type="single"
			bind:value={openFaq}
			class="space-y-3"
			onValueChange={(v: string | undefined) => {
				if (v !== undefined) track('faq_open', { question: faqs[+v]?.q, page: 'for-bakeries' });
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
<section class="bg-primary/95 px-6 py-20">
	<div class="mx-auto max-w-2xl text-center">
		<h2 class="text-3xl font-bold text-white sm:text-4xl">Your next holiday rush, organized.</h2>
		<p class="mt-4 text-lg text-primary-foreground/80">
			Set up your pre-order page today. Free to start, no credit card required.
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'final_banner', page: 'for-bakeries' })}
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
					<a href={resolve('/#pricing')} class="transition-colors hover:text-foreground">Pricing</a>
					<a href={loginHref} class="transition-colors hover:text-foreground">Sign in</a>
				</nav>
			</div>
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Solutions</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/for-bakeries')} class="transition-colors hover:text-foreground"
						>For Bakeries</a
					>
					<a href={resolve('/for-farmers-markets')} class="transition-colors hover:text-foreground"
						>For Farmers Markets</a
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
