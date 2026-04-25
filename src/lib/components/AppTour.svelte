<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { tourState } from '$lib/tour-state.svelte';

	const STORAGE_KEY = 'ol_tour_done';
	const PAD = 10;

	type Rect = { top: number; left: number; width: number; height: number };

	const steps = [
		{
			selector: '[data-tour="create-tenant"]',
			title: 'First — Create a tenant',
			description:
				'A tenant is your business profile on Order Local. Create one now to get your ordering page, menu, and dashboard set up.',
			action: null
		},
		{
			selector: '[data-tour="overview"]',
			title: "You're in!",
			description:
				"This is your dashboard overview. Once orders start coming in you'll see live stats and recent activity here.",
			action: null
		},
		{
			selector: '[data-tour="settings"]',
			title: 'Step 1 — Connect Stripe',
			description:
				'Go to Settings → Integrations to connect your Stripe account. This is required before customers can pay for their orders.',
			action: { label: 'Go to Integrations', href: '/dashboard/settings/integrations' }
		},
		{
			selector: '[data-tour="menu"]',
			title: 'Step 2 — Build your menu',
			description:
				'Head to Menu to create categories and add items with photos, descriptions, and pricing. This is what customers browse when placing an order.',
			action: { label: 'Go to Menu', href: '/dashboard/menu' }
		},
		{
			selector: '[data-tour="settings"]',
			title: 'Step 3 — Customize branding',
			description:
				'Go to Settings → Branding to upload your logo and choose your brand colors. This personalizes the customer-facing ordering page.',
			action: { label: 'Go to Branding', href: '/dashboard/settings/branding' }
		},
		{
			selector: '[data-tour="view-menu"]',
			title: "You're ready to go!",
			description:
				'Once your menu is built, click View menu to see exactly what your customers see when they scan your QR code or visit your ordering page.',
			action: null
		}
	];

	let step = $state(0);
	let rect = $state<Rect | null>(null);
	let isMobile = $state(false);

	function checkMobile() {
		isMobile = window.innerWidth < 768;
	}

	function updateSidebar() {
		if (!isMobile) {
			tourState.openSidebar = false;
			return;
		}
		// Open sidebar only when the target element lives inside <aside>
		const el = document.querySelector(steps[step].selector);
		const sidebar = document.querySelector('aside');
		tourState.openSidebar = el ? (sidebar?.contains(el) ?? false) : false;
	}

	function measureRect() {
		const el = document.querySelector(steps[step].selector);
		if (el) {
			const r = el.getBoundingClientRect();
			rect = {
				top: r.top - PAD,
				left: r.left - PAD,
				width: r.width + PAD * 2,
				height: r.height + PAD * 2
			};
		} else {
			rect = null;
		}
	}

	$effect(() => {
		const active = tourState.active;
		const currentStep = step;
		if (active) {
			void currentStep;
			requestAnimationFrame(() => {
				updateSidebar();
				// Give sidebar animation time to finish before measuring
				setTimeout(measureRect, isMobile ? 220 : 0);
			});
		} else {
			rect = null;
			tourState.openSidebar = false;
		}
	});

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

	onMount(() => {
		checkMobile();
		const handler = () => {
			checkMobile();
			measureRect();
		};
		window.addEventListener('resize', handler);
		return () => window.removeEventListener('resize', handler);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (!tourState.active) return;
		if (e.key === 'Escape') finish();
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
	}

	const tooltipStyle = $derived.by(() => {
		if (isMobile) {
			// Bottom sheet on mobile — ignore rect position
			return 'bottom:0;left:0;right:0;border-bottom-left-radius:0;border-bottom-right-radius:0';
		}
		if (rect) {
			// Right of spotlight on desktop, clamped to viewport
			const top = Math.max(8, rect.top + rect.height / 2 - 80);
			const left = rect.left + rect.width + 16;
			return `top:${top}px;left:${left}px`;
		}
		// Centered fallback (element not in DOM)
		return 'top:50%;left:50%;transform:translate(-50%,-50%)';
	});
</script>

<svelte:window onkeydown={handleKeydown} />

{#if tourState.active}
	{#if rect}
		<!-- 4-quadrant spotlight overlay -->
		<div class="pointer-events-none fixed inset-0 z-200" aria-hidden="true">
			<div class="absolute bg-black/70" style="top:0;left:0;right:0;height:{rect.top}px"></div>
			<div
				class="absolute bg-black/70"
				style="top:{rect.top + rect.height}px;left:0;right:0;bottom:0"
			></div>
			<div
				class="absolute bg-black/70"
				style="top:{rect.top}px;left:0;width:{rect.left}px;height:{rect.height}px"
			></div>
			<div
				class="absolute bg-black/70"
				style="top:{rect.top}px;left:{rect.left + rect.width}px;right:0;height:{rect.height}px"
			></div>
			<div
				class="absolute rounded-lg ring-2 ring-white/70"
				style="top:{rect.top}px;left:{rect.left}px;width:{rect.width}px;height:{rect.height}px"
			></div>
		</div>
	{:else}
		<div class="pointer-events-none fixed inset-0 z-200 bg-black/70" aria-hidden="true"></div>
	{/if}

	<!-- Tooltip card -->
	<div
		class="fixed z-201 rounded-xl bg-background shadow-2xl {isMobile
			? 'rounded-b-none p-5 pb-8'
			: 'w-72 p-5'}"
		style={tooltipStyle}
		role="dialog"
		aria-label="Tour step {step + 1} of {steps.length}"
	>
		<div class="mb-3 flex items-center justify-between">
			<div class="flex gap-1">
				{#each steps.map((_, i) => i) as i (i)}
					<span
						class="h-1.5 w-1.5 rounded-full transition-colors {i === step
							? 'bg-gray-900'
							: 'bg-muted'}"
					></span>
				{/each}
			</div>
			<Button onclick={finish} variant="ghost" size="icon-sm" class="text-muted-foreground/40 hover:text-muted-foreground" aria-label="Close tour">
				<Icon icon="mdi:close" class="h-4 w-4" />
			</Button>
		</div>

		<h3 class="mb-1.5 text-sm font-semibold text-foreground">{steps[step].title}</h3>
		<p class="mb-4 text-sm leading-relaxed text-muted-foreground">{steps[step].description}</p>

		{#if steps[step].action}
			<a
				href={resolve(steps[step].action!.href as `/${string}`)}
				onclick={finish}
				class="mb-3 flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary"
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
