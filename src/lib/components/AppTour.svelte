<script lang="ts">
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { tourState } from '$lib/tour-state.svelte';

	const STORAGE_KEY = 'ol_tour_done';

	const steps = [
		{
			selector: '[data-tour="create-tenant"]',
			title: 'Welcome to Order Local',
			description:
				"Let's get your business set up in a few quick steps. First, create a tenant — this is your business profile that powers your ordering page, menu, and dashboard.",
			action: null
		},
		{
			selector: '[data-tour="overview"]',
			title: 'Your dashboard',
			description:
				"This overview shows live order stats and recent activity. It'll fill up fast once customers start ordering — for now, let's get everything configured.",
			action: null
		},
		{
			selector: '[data-tour="settings"]',
			title: 'Step 1 — Connect Stripe',
			description:
				"Head to Settings → Integrations to connect your Stripe account. Stripe handles all payments securely — customers can't check out until this is done.",
			action: { label: 'Go to Integrations', href: '/dashboard/settings/integrations' }
		},
		{
			selector: '[data-tour="menu"]',
			title: 'Step 2 — Build your menu',
			description:
				'Go to Menu to add categories, items, photos, and prices. This is exactly what your customers will browse when they place an order.',
			action: { label: 'Go to Menu', href: '/dashboard/menu' }
		},
		{
			selector: '[data-tour="settings"]',
			title: 'Step 3 — Add your branding',
			description:
				'Visit Settings → Branding to upload your logo and pick your brand colors. A branded ordering page builds trust and looks professional.',
			action: { label: 'Go to Branding', href: '/dashboard/settings/branding' }
		},
		{
			selector: '[data-tour="view-menu"]',
			title: "You're all set!",
			description:
				"That's everything you need to start taking orders. Click Open Live View button menu anytime to preview your ordering page exactly as your customers see it.",
			action: null
		}
	];

	let step = $state(0);

	function next() {
		if (step < steps.length - 1) step++;
		else finish();
	}

	function prev() {
		if (step > 0) step--;
	}

	function finish() {
		tourState.active = false;
		tourState.openSidebar = false;
		step = 0;
		localStorage.setItem(STORAGE_KEY, 'true');
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!tourState.active) return;
		if (e.key === 'Escape') finish();
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if tourState.active}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-200 bg-black/70" aria-hidden="true" onclick={finish}></div>

	<!-- Centered modal -->
	<div
		class="fixed top-1/2 left-1/2 z-201 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-background p-6 shadow-2xl"
		role="dialog"
		aria-label="Tour step {step + 1} of {steps.length}"
	>
		<div class="mb-4 flex items-center justify-between">
			<div class="flex gap-1.5">
				{#each steps.map((_, i) => i) as i (i)}
					<span
						class="h-1.5 w-1.5 rounded-full transition-colors {i === step
							? 'bg-foreground'
							: 'bg-muted-foreground/30'}"
					></span>
				{/each}
			</div>
			<Button
				onclick={finish}
				variant="ghost"
				size="icon-sm"
				class="text-muted-foreground/40 hover:text-muted-foreground"
				aria-label="Close tour"
			>
				<Icon icon="mdi:close" class="h-4 w-4" />
			</Button>
		</div>

		<p class="mb-0.5 text-xs font-medium text-muted-foreground">
			Step {step + 1} of {steps.length}
		</p>
		<h3 class="mb-2 text-base font-semibold text-foreground">{steps[step].title}</h3>
		<p class="mb-5 text-sm leading-relaxed text-muted-foreground">{steps[step].description}</p>

		{#if steps[step].action}
			<a
				href={resolve(steps[step].action!.href as `/${string}`)}
				onclick={finish}
				class="mb-4 flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
			>
				<Icon icon="mdi:arrow-right-circle-outline" class="h-4 w-4" />
				{steps[step].action!.label}
			</a>
		{/if}

		<div class="flex items-center justify-between">
			<Button
				onclick={prev}
				disabled={step === 0}
				variant="ghost"
				size="sm"
				class="gap-0.5 text-muted-foreground hover:text-muted-foreground disabled:pointer-events-none disabled:opacity-0"
			>
				<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Back
			</Button>
			<Button onclick={next} variant="default" size="sm" class="gap-0.5">
				{#if step === steps.length - 1}
					Finish
				{:else}
					Next <Icon icon="mdi:chevron-right" class="h-4 w-4" />
				{/if}
			</Button>
		</div>
	</div>
{/if}
