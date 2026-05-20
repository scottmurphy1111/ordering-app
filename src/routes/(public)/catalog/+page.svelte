<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import {
		cart,
		CartTypeMismatchError,
		type PickupType,
		type CartModifier,
		type AvailabilityMode
	} from '$lib/cart.svelte';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import StorefrontOpenStatus from '$lib/components/storefront/StorefrontOpenStatus.svelte';
	import UpcomingPickupEvents from '$lib/components/storefront/UpcomingPickupEvents.svelte';
	import CatalogHero from '$lib/components/storefront/CatalogHero.svelte';
	import CatalogItemCard from '$lib/components/storefront/CatalogItemCard.svelte';
	import CartPanel from '$lib/components/storefront/CartPanel.svelte';
	import { Sheet, SheetContent, SheetTitle } from '$lib/components/ui/sheet';


	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.vendorSlug));

	const vendor = $derived(data.vendor);
	const isPaused = $derived(!!data.vendor.subscriptionPausedAt);
	const fulfillmentModel = $derived(data.vendor.fulfillmentModel);
	const showOpenStatus = $derived(
		fulfillmentModel === 'storefront' || fulfillmentModel === 'hybrid'
	);
	const showUpcomingEvents = $derived(
		fulfillmentModel === 'pickup_only' || fulfillmentModel === 'hybrid'
	);

	// ── Category/item data ───────────────────────────────────────────────────
	const categorized = $derived(
		data.categories
			.map((cat) => ({ ...cat, items: data.itemsByCategory[cat.id] ?? [] }))
			.filter((c) => c.items.length > 0)
	);
	const visibleCategoryIds = $derived(new Set(data.categories.map((c) => c.id)));
	const uncategorized = $derived(
		data.items.filter((item) => !item.categoryId || !visibleCategoryIds.has(item.categoryId))
	);

	// ── Search ───────────────────────────────────────────────────────────────
	let searchQuery = $state('');

	function matchesQuery(item: { name: string; description?: string | null }, q: string) {
		const lq = q.toLowerCase();
		return (
			item.name.toLowerCase().includes(lq) ||
			(item.description?.toLowerCase().includes(lq) ?? false)
		);
	}

	const filteredCategorized = $derived(
		searchQuery.trim()
			? categorized
					.map((cat) => ({
						...cat,
						items: cat.items.filter((i: (typeof cat.items)[number]) => matchesQuery(i, searchQuery))
					}))
					.filter((cat) => cat.items.length > 0)
			: categorized
	);
	const filteredUncategorized = $derived(
		searchQuery.trim() ? uncategorized.filter((i) => matchesQuery(i, searchQuery)) : uncategorized
	);
	const hasResults = $derived(filteredCategorized.length > 0 || filteredUncategorized.length > 0);

	// ── Cart helpers ─────────────────────────────────────────────────────────
	function effectivePrice(item: { price: number; discountedPrice: number | null }) {
		return item.discountedPrice ?? item.price;
	}

	// ── Mobile cart sheet ────────────────────────────────────────────────────
	let cartSheetOpen = $state(false);

	// ── Add-to-cart micro-animation ──────────────────────────────────────────
	let lastAddedId = $state<number | null>(null);
	let pulsingId = $state<number | null>(null);
	let addedTimer: ReturnType<typeof setTimeout> | null = null;

	async function addSimple(item: {
		id: number;
		name: number | string;
		price: number;
		discountedPrice: number | null;
		images: unknown;
		pickupType: PickupType;
		customDateLeadDays?: number | null;
		availabilityMode?: AvailabilityMode | null;
	}) {
		const images = item.images as { url: string; isPrimary?: boolean }[] | null;
		const imageUrl = images?.find((i) => i.isPrimary)?.url ?? images?.[0]?.url;
		const addArgs = {
			itemId: item.id,
			name: String(item.name),
			basePrice: effectivePrice(item as { price: number; discountedPrice: number | null }),
			selectedModifiers: [] as CartModifier[],
			imageUrl,
			pickupType: item.pickupType,
			customDateLeadDays: item.customDateLeadDays ?? undefined,
			availabilityMode: item.availabilityMode ?? undefined
		};

		try {
			cart.add(addArgs);
			// Auto-open the cart sheet on mobile after add
			if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
				cartSheetOpen = true;
			}
		} catch (e) {
			if (e instanceof CartTypeMismatchError) {
				const confirmed = await confirmDialog(
					'Special-order items are placed separately — they have their own checkout and approval. Start a new cart for this item?',
					{
						title: 'Start a new cart?',
						confirmLabel: 'Start new cart',
						cancelLabel: 'Cancel',
						danger: true
					}
				);
				if (!confirmed) return;
				cart.clear();
				cart.add(addArgs);
				if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
					cartSheetOpen = true;
				}
			} else {
				throw e;
			}
		}

		pulsingId = item.id;
		setTimeout(() => {
			pulsingId = null;
		}, 350);

		if (addedTimer) clearTimeout(addedTimer);
		lastAddedId = item.id;
		addedTimer = setTimeout(() => {
			lastAddedId = null;
		}, 2500);
	}

	// ── IntersectionObserver: active category nav ────────────────────────────
	let activeCategoryId = $state<string | null>(null);

	onMount(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) activeCategoryId = entry.target.id;
				}
			},
			{ rootMargin: '-15% 0px -75% 0px', threshold: 0 }
		);
		document.querySelectorAll('section[id]').forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});

	function scrollToSection(id: string) {
		const el = document.getElementById(id);
		if (!el) return;
		const stickyBar = document.querySelector('.sticky') as HTMLElement | null;
		const offset = (stickyBar?.offsetHeight ?? 0) + 16;
		window.scrollTo({
			top: el.getBoundingClientRect().top + window.scrollY - offset,
			behavior: 'smooth'
		});
	}
</script>

<svelte:head>
	<title>{vendor.name}</title>
</svelte:head>

<!-- Hero: identity + status -->
<CatalogHero {vendor}>
	{#if showOpenStatus}
		<StorefrontOpenStatus
			hours={data.hours}
			exceptions={data.exceptions}
			vendorTimezone={data.vendor.timezone}
		/>
	{:else if showUpcomingEvents}
		<UpcomingPickupEvents
			windows={data.upcomingWindows}
			vendorTimezone={data.vendor.timezone}
		/>
	{/if}
</CatalogHero>

<!-- Pause notice -->
{#if isPaused}
	<div class="border-b border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
		<Icon icon="mdi:pause-circle-outline" class="mb-0.5 inline-block h-4 w-4 align-text-bottom" />
		Online ordering is temporarily unavailable. Check back soon.
	</div>
{/if}

<!-- Two-column layout -->
<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:grid md:grid-cols-[1fr_320px] md:gap-8">
	<!-- Left column: catalog content -->
	<div class="min-w-0">
		<!-- Search input -->
		{#if data.items.length > 0}
			<div class="relative mb-6">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400"
				/>
				<input
					type="search"
					placeholder="Search the menu…"
					bind:value={searchQuery}
					class="w-full rounded-full border border-neutral-200 bg-white py-2.5 pr-4 pl-9 text-sm text-neutral-900 outline-none transition-colors focus:border-neutral-400"
				/>
				{#if searchQuery}
					<button
						type="button"
						onclick={() => (searchQuery = '')}
						class="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
					>
						<Icon icon="mdi:close-circle" class="h-4 w-4" />
					</button>
				{/if}
			</div>
		{/if}

		<!-- Category pills (hidden while searching) -->
		{#if !searchQuery && filteredCategorized.length > 0}
			<nav class="-mx-4 mb-8 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
				<div class="flex gap-2 pb-2">
					{#each filteredCategorized as category (category.id)}
						<a
							href="#{category.id}"
							onclick={(e) => {
								e.preventDefault();
								scrollToSection(String(category.id));
							}}
							class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeCategoryId ===
							String(category.id)
								? ''
								: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}"
							style={activeCategoryId === String(category.id)
								? 'background-color: var(--background-color); color: var(--foreground-color);'
								: ''}
						>
							{category.name}
						</a>
					{/each}
					{#if filteredUncategorized.length > 0}
						<a
							href="#other"
							onclick={(e) => {
								e.preventDefault();
								scrollToSection('other');
							}}
							class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeCategoryId ===
							'other'
								? ''
								: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}"
							style={activeCategoryId === 'other'
								? 'background-color: var(--background-color); color: var(--foreground-color);'
								: ''}
						>
							Other
						</a>
					{/if}
					{#if !isPaused && vendor.acceptsRequests}
						<a
							href="#special-requests"
							onclick={(e) => {
								e.preventDefault();
								scrollToSection('special-requests');
							}}
							class="shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors {activeCategoryId ===
							'special-requests'
								? ''
								: 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}"
							style={activeCategoryId === 'special-requests'
								? 'background-color: var(--background-color); color: var(--foreground-color);'
								: ''}
						>
							Special Requests
						</a>
					{/if}
				</div>
			</nav>
		{/if}

		<!-- Sections -->
		{#if data.items.length === 0}
			<div class="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
				<p class="text-neutral-500">Coming soon.</p>
			</div>
		{:else if !hasResults}
			<div class="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
				<Icon icon="mdi:magnify" class="mx-auto mb-3 h-8 w-8 text-neutral-400" />
				<p class="text-sm text-neutral-600">No items match "{searchQuery}".</p>
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="mt-4 text-sm font-medium hover:underline"
					style="color: var(--background-color);"
				>
					Clear search
				</button>
			</div>
		{:else}
			<div class="space-y-12">
				{#each filteredCategorized as category (category.id)}
					<section id={String(category.id)}>
						<h2
							class="mb-5 text-xs font-bold tracking-widest text-neutral-900 uppercase"
							style="font-family: var(--font-heading);"
						>
							{category.name}
						</h2>
						<div class="grid gap-3 sm:grid-cols-2">
							{#each category.items as item (item.id)}
								<CatalogItemCard
									{item}
									{isPaused}
									isAdding={pulsingId === item.id}
									wasJustAdded={lastAddedId === item.id}
									onAdd={() => addSimple(item)}
								/>
							{/each}
						</div>
					</section>
				{/each}

				{#if filteredUncategorized.length > 0}
					<section id="other">
						{#if filteredCategorized.length > 0}
							<h2
								class="mb-5 text-xs font-bold tracking-widest text-neutral-900 uppercase"
								style="font-family: var(--font-heading);"
							>
								Other
							</h2>
						{/if}
						<div class="grid gap-3 sm:grid-cols-2">
							{#each filteredUncategorized as item (item.id)}
								<CatalogItemCard
									{item}
									{isPaused}
									isAdding={pulsingId === item.id}
									wasJustAdded={lastAddedId === item.id}
									onAdd={() => addSimple(item)}
								/>
							{/each}
						</div>
					</section>
				{/if}

				<!-- Custom orders section -->
				{#if !isPaused && vendor.acceptsRequests}
					<section id="special-requests">
						<h2
							class="mb-5 text-xs font-bold tracking-widest text-neutral-900 uppercase"
							style="font-family: var(--font-heading);"
						>
							Special Requests
						</h2>
						<a
							href={resolve('/request' as `/${string}`)}
							class="block rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md"
						>
							<h3
								class="font-semibold text-neutral-900"
								style="font-family: var(--font-heading);"
							>
								Looking for something custom?
							</h3>
							<p class="mt-1 text-sm text-neutral-600">
								Send {vendor.name} a request and they'll get back to you with a quote.
							</p>
							<span
								class="mt-4 inline-flex items-center gap-1 text-sm font-medium"
								style="color: var(--background-color);"
							>
								Make a special request
								<Icon icon="mdi:arrow-right" class="h-4 w-4" />
							</span>
						</a>
					</section>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Right column: cart panel -->
	<aside class="hidden md:block">
		<div class="sticky top-20">
			<div class="rounded-xl border border-neutral-200 bg-white p-5">
				<CartPanel />
			</div>
		</div>
	</aside>
</div>

<!-- Mobile cart trigger + sheet -->
<Sheet bind:open={cartSheetOpen}>
	{#if cart.count > 0 && !isPaused}
		<div class="sticky bottom-0 flex justify-center p-4 md:hidden">
			<button
				type="button"
				onclick={() => (cartSheetOpen = true)}
				style="background-color: var(--background-color); color: var(--foreground-color);"
				class="flex w-full max-w-2xl items-center justify-between rounded-xl px-5 py-3.5 shadow-lg transition-opacity hover:opacity-90"
			>
				<span class="flex items-center gap-1.5">
					<span
						class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
						>{cart.count}</span
					>
					<span class="text-sm font-medium opacity-80">
						{cart.count === 1 ? 'item' : 'items'}
					</span>
				</span>
				<span class="shrink-0 font-semibold">
					View Cart → ${(cart.subtotal / 100).toFixed(2)}
				</span>
			</button>
		</div>
	{/if}
	<SheetContent side="bottom" showCloseButton={false} class="flex max-h-[85vh] flex-col p-5">
		<SheetTitle class="sr-only">Your Order</SheetTitle>
		<CartPanel onCheckout={() => (cartSheetOpen = false)} />
	</SheetContent>
</Sheet>
