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
	import { Badge } from '$lib/components/ui/badge';
	import type { Persona } from '$lib/marketing/personas';
	import { TIERS } from '$lib/billing';

	type Props = { persona: Persona };
	let { persona }: Props = $props();

	const loginHref = resolve('/login');
	const highlightTier = 'pro';

	let mobileMenuOpen = $state(false);
	let openFaq = $state<string | undefined>(undefined);

	const faqJsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'FAQPage',
			mainEntity: persona.faqs.map((f) => ({
				'@type': 'Question',
				name: f.q,
				acceptedAnswer: { '@type': 'Answer', text: f.a }
			}))
		})
	);
</script>

<svelte:head>
	<title>{persona.metaTitle}</title>
	<meta name="description" content={persona.metaDescription} />
	<meta property="og:title" content={persona.metaTitle} />
	<meta property="og:description" content={persona.metaDescription} />
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
				onclick={() => track('cta_click', { location: 'header', page: persona.trackPage })}
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
	<div class="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-[1.1fr_0.9fr]">
		<!-- Text column -->
		<div class="text-center md:text-left">
			<span
				class="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-widest text-primary/90 uppercase"
			>
				{persona.eyebrow}
			</span>
			<h1 class="text-5xl leading-tight font-bold tracking-tight text-foreground sm:text-6xl">
				{persona.heroHeadline}
			</h1>
			<p class="mt-6 text-lg leading-relaxed text-muted-foreground">
				{persona.heroSubhead}
			</p>
			<div
				class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start"
			>
				<a
					href={loginHref}
					onclick={() => track('cta_click', { location: 'hero', page: persona.trackPage })}
					class="w-full rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-primary/90 sm:w-auto"
				>
					{persona.heroPrimaryCtaLabel}
				</a>
				<a
					href="#how-it-works"
					class="w-full rounded-xl border bg-background px-8 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-muted/50 sm:w-auto"
				>
					{persona.heroSecondaryCtaLabel}
				</a>
			</div>
			<p class="mt-4 text-xs text-muted-foreground">
				No credit card to start · Free plan available · Keep 100% of your sales
			</p>
		</div>

		<!-- Photo column -->
		<div class="overflow-hidden rounded-2xl shadow-md">
			<img
				src={persona.heroImage.src}
				alt={persona.heroImage.alt}
				class="h-64 w-full object-cover md:h-full md:min-h-[480px]"
				loading="eager"
			/>
		</div>
	</div>
</section>

<!-- Value tiles -->
<section class="border-y bg-muted/40 px-6 py-16">
	<div class="mx-auto max-w-5xl">
		<div class="grid gap-8 sm:grid-cols-3">
			{#each persona.valueTiles as tile (tile.title)}
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
				{persona.howItWorksHeadline}
			</h2>
		</div>
		<div class="relative grid gap-10 sm:grid-cols-3">
			<div
				class="absolute inset-x-0 top-6 -z-10 hidden h-px border-t border-dashed border-zinc-300 sm:block"
			></div>
			{#each persona.steps as step (step.num)}
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
				{persona.featuresHeadline}
			</h2>
		</div>
		<div class="grid gap-6 sm:grid-cols-2">
			{#each persona.features as f (f.title)}
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
				{persona.pricing.headline}
			</h2>
			<p class="mt-3 text-lg text-muted-foreground">
				{persona.pricing.subhead}
			</p>
		</div>

		<div class="grid items-start gap-6 lg:grid-cols-3">
			{#each TIERS as tier (tier.key)}
				{@const isHighlight = tier.key === highlightTier}
				{@const tagline = persona.pricing.taglinesByTier?.[tier.key]}
				<div class="relative flex h-full flex-col {isHighlight ? 'lg:scale-101' : ''}">
					{#if isHighlight}
						<div class="absolute -top-3 right-0 left-0 flex justify-center">
							<Badge class="bg-primary text-primary-foreground shadow-sm">
								Most popular for {persona.label.toLowerCase()}
							</Badge>
						</div>
					{/if}
					<div
						class="flex flex-1 flex-col overflow-hidden rounded-2xl border {isHighlight
							? 'border-primary shadow-2xl ring-2 ring-primary/20'
							: 'bg-background'}"
					>
						{#if isHighlight}
							<div class="h-1 bg-primary"></div>
						{/if}
						<div class="flex flex-1 flex-col p-7">
							<p class="text-lg font-bold text-foreground">{tier.name}</p>
							{#if tagline}
								<p class="mt-1 text-sm text-muted-foreground">{tagline}</p>
							{/if}
							<div class="mt-5 flex items-end gap-x-2">
								{#if tier.price === 0}
									<span class="text-4xl font-bold text-foreground">Free</span>
								{:else}
									<span class="text-4xl font-bold text-foreground">${tier.price}</span>
									<span class="mb-1 text-sm text-muted-foreground">/ month</span>
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
								onclick={() =>
									track('cta_click', {
										location: `pricing_${tier.key}`,
										page: persona.trackPage
									})}
								class="mt-8 block rounded-xl px-5 py-3 text-center text-sm font-semibold text-white transition-colors {isHighlight
									? 'bg-primary hover:bg-primary/90'
									: 'bg-gray-900 hover:bg-gray-700'}"
							>
								Get started
							</a>
						</div>
					</div>
				</div>
			{/each}
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
			<h2 class="text-3xl font-bold text-foreground sm:text-4xl">{persona.faqHeadline}</h2>
		</div>
		<Accordion
			type="single"
			bind:value={openFaq}
			class="space-y-3"
			onValueChange={(v: string | undefined) => {
				if (v !== undefined)
					track('faq_open', { question: persona.faqs[+v]?.q, page: persona.trackPage });
			}}
		>
			{#each persona.faqs as faq, i (faq.q)}
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
	style="background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url('{persona.closingImage}'); background-size: cover; background-position: center;"
>
	<div class="mx-auto max-w-2xl rounded-xl bg-black/20 px-10 py-12 text-center backdrop-blur-sm">
		<h2 class="text-3xl font-bold text-white text-shadow-lg sm:text-4xl">
			{persona.closingHeadline}
		</h2>
		<p class="mt-4 text-lg font-semibold text-primary-foreground text-shadow-md">
			{persona.closingSubhead}
		</p>
		<a
			href={loginHref}
			onclick={() => track('cta_click', { location: 'final_banner', page: persona.trackPage })}
			class="mt-8 inline-block rounded-xl bg-background px-10 py-3.5 text-base font-bold text-primary/90 shadow-md transition-colors hover:bg-white/90"
		>
			{persona.closingCtaLabel}
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
