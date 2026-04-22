<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { cart } from '$lib/cart.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import { getOpenStatus } from '$lib/hours';
	import type { WeekHours } from '$lib/hours';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.tenantSlug));

	const tenant = $derived(data.tenant);
	const tableParam = $derived(page.url.searchParams.get('table'));
	const settings = $derived(tenant.settings as Record<string, unknown> | null);

	// ── Open/closed status ───────────────────────────────────────────────────
	let openStatus = $state<boolean | null>(null);
	onMount(() => {
		const hours = settings?.hours as WeekHours | undefined;
		openStatus = getOpenStatus(hours);
		const interval = setInterval(() => {
			openStatus = getOpenStatus(hours);
		}, 60_000);
		return () => clearInterval(interval);
	});

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
	function hasModifiers(item: { modifiers: unknown[] }) {
		return item.modifiers.length > 0;
	}

	// ── Add-to-cart micro-animation ──────────────────────────────────────────
	let lastAddedId = $state<number | null>(null);
	let pulsingId = $state<number | null>(null);
	let addedTimer: ReturnType<typeof setTimeout> | null = null;

	function addSimple(item: {
		id: number;
		name: number | string;
		price: number;
		discountedPrice: number | null;
		images: unknown;
	}) {
		const images = item.images as { url: string; isPrimary?: boolean }[] | null;
		const imageUrl = images?.find((i) => i.isPrimary)?.url ?? images?.[0]?.url;
		cart.add({
			itemId: item.id,
			name: String(item.name),
			basePrice: effectivePrice(item as { price: number; discountedPrice: number | null }),
			selectedModifiers: [],
			imageUrl
		});

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

	// ── Skeleton loader ──────────────────────────────────────────────────────
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<svelte:head>
	<title>{tenant.name} — Menu</title>
</svelte:head>

<div class="min-h-screen">
	<!-- ── Banner hero or colored header ──────────────────────────────────── -->
	{#if tenant.bannerUrl}
		<div class="relative h-56 overflow-hidden sm:h-72">
			<img
				src={tenant.bannerUrl}
				alt={tenant.name}
				class="absolute inset-0 h-full w-full object-cover"
			/>
			<div class="absolute inset-0 bg-linear-to-t from-black/75 via-black/25 to-transparent"></div>
			<div class="absolute inset-x-0 bottom-0 mx-auto max-w-2xl px-4 pb-5">
				<div class="mb-2 flex items-center gap-4">
					{#if tenant.logoUrl}
						<img
							src={tenant.logoUrl}
							alt={tenant.name}
							class="h-16 w-auto max-w-48 object-contain drop-shadow"
							style="filter: brightness(0) invert(1);"
						/>
					{/if}
					<div class="flex flex-wrap items-center gap-2">
						{#if tenant.website}
							<a
								href={tenant.website}
								target="_blank"
								rel="noopener noreferrer"
								class="text-2xl font-bold text-white drop-shadow hover:underline">{tenant.name}</a
							>
						{:else}
							<h1 class="text-2xl font-bold text-white drop-shadow">{tenant.name}</h1>
						{/if}
					</div>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					{#if openStatus !== null}
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold {openStatus
								? 'bg-green-500 text-white'
								: 'bg-red-500 text-white'}"
						>
							{openStatus ? 'Open' : 'Closed'}
						</span>
					{/if}
					{#if tableParam}
						<span
							class="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm"
						>
							<Icon icon="mdi:table-chair" class="h-3 w-3" /> Table {tableParam}
						</span>
					{/if}
				</div>
				{#if tenant.type}
					<p class="mt-0.5 text-sm text-white/70 capitalize">{tenant.type.replace('_', ' ')}</p>
				{/if}
			</div>
		</div>
	{:else}
		<header style="background-color: var(--primary-color);">
			<div class="mx-auto max-w-2xl px-4 py-5">
				<div class="flex items-center gap-4">
					{#if tenant.logoUrl}
						<img
							src={tenant.logoUrl}
							alt={tenant.name}
							class="h-16 w-auto max-w-48 shrink-0 object-contain"
						/>
					{/if}
					<div>
						{#if tenant.website}
							<a
								href={tenant.website}
								target="_blank"
								rel="noopener noreferrer"
								class="transition-opacity hover:opacity-80"
							>
								<h1 class="text-2xl font-bold" style="color: var(--accent-color);">
									{tenant.name}
								</h1>
							</a>
						{:else}
							<h1 class="text-2xl font-bold" style="color: var(--accent-color);">{tenant.name}</h1>
						{/if}
					</div>
				</div>
				<div class="mt-2 flex flex-wrap items-center gap-2">
					{#if tenant.type}
						<p class="text-sm capitalize opacity-75" style="color: var(--accent-color);">
							{tenant.type.replace('_', ' ')}
						</p>
					{/if}
					{#if openStatus !== null}
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold {openStatus
								? 'bg-green-500 text-white'
								: 'bg-red-500/90 text-white'}"
						>
							{openStatus ? 'Open' : 'Closed'}
						</span>
					{/if}
					{#if tableParam}
						<span
							class="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur-sm"
							style="color: var(--accent-color);"
						>
							<Icon icon="mdi:table-chair" class="h-3 w-3" /> Table {tableParam}
						</span>
					{/if}
				</div>
			</div>
		</header>
	{/if}

	<!-- ── Search bar ─────────────────────────────────────────────────────── -->
	{#if data.items.length > 0}
		<div class="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
			<div class="mx-auto max-w-2xl px-4 pt-2">
				<!-- Search input -->
				<div class="relative mb-2">
					<Icon
						icon="mdi:magnify"
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
					/>
					<input
						type="search"
						placeholder="Search menu…"
						bind:value={searchQuery}
						class="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pr-4 pl-9 text-sm transition-colors outline-none focus:border-gray-400 focus:bg-white"
					/>
					{#if searchQuery}
						<button
							onclick={() => {
								searchQuery = '';
							}}
							class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<Icon icon="mdi:close-circle" class="h-4 w-4" />
						</button>
					{/if}
				</div>

				<!-- Category nav (hidden while searching) -->
				{#if !searchQuery && filteredCategorized.length > 0}
					<div class="overflow-x-auto">
						<div class="flex gap-1 pb-2">
							{#each filteredCategorized as category (category.id)}
								<a
									href="#{category.id}"
									class="category-pill shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors {activeCategoryId ===
									String(category.id)
										? 'active'
										: ''}"
								>
									{category.name}
								</a>
							{/each}
							{#if filteredUncategorized.length > 0}
								<a
									href="#other"
									class="category-pill shrink-0 rounded-full px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors {activeCategoryId ===
									'other'
										? 'active'
										: ''}"
								>
									Other
								</a>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- ── Menu items ─────────────────────────────────────────────────────── -->
	<main
		class="mx-auto my-8 max-w-2xl space-y-10 rounded-2xl bg-white/80 px-4 py-8 backdrop-blur-sm"
	>
		{#if data.items.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<p class="text-gray-400">Menu coming soon.</p>
			</div>
		{:else if !hasResults}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<Icon icon="mdi:magnify" class="mx-auto mb-3 h-8 w-8 text-gray-300" />
				<p class="text-gray-400">No items match "<span class="font-medium">{searchQuery}</span>"</p>
				<button
					onclick={() => {
						searchQuery = '';
					}}
					class="mt-3 text-sm font-medium"
					style="color: var(--primary-color);">Clear search</button
				>
			</div>
		{:else if !mounted}
			<!-- Skeleton -->
			<div class="space-y-3">
				{#each { length: 5 } as _}
					<div class="flex gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
						<div class="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-gray-200"></div>
						<div class="flex-1 space-y-2 py-1">
							<div class="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
							<div class="h-3 w-1/2 animate-pulse rounded bg-gray-200"></div>
							<div class="h-3 w-1/4 animate-pulse rounded bg-gray-200"></div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			{#each filteredCategorized as category (category.id)}
				<section id={String(category.id)}>
					<h2
						class="mb-4 border-b-2 pb-2 text-lg font-semibold text-gray-800"
						style="border-color: var(--primary-color);"
					>
						{category.name}
					</h2>
					<div class="space-y-3">
						{#each category.items as item (item.id)}
							{@const imgs = item.images as { url: string; isPrimary?: boolean }[] | null}
							{@const primaryImage = imgs?.find((i) => i.isPrimary)?.url ?? imgs?.[0]?.url}
							<div
								class="item-card flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								{#if primaryImage}
									<img
										src={primaryImage}
										alt={item.name}
										class="h-20 w-20 shrink-0 rounded-lg object-cover"
									/>
								{/if}
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span
													class="rounded-full px-2 py-0.5 text-xs"
													style="background-color: color-mix(in srgb, var(--secondary-color) 15%, white); color: var(--secondary-color);"
													>{tag}</span
												>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold" style="color: var(--primary-color);">
												${(item.discountedPrice / 100).toFixed(2)}
											</p>
											<p class="text-xs text-gray-400 line-through">
												${(item.price / 100).toFixed(2)}
											</p>
										{:else}
											<p class="font-semibold text-gray-900">${(item.price / 100).toFixed(2)}</p>
										{/if}
									</div>
									{#if hasModifiers(item)}
										<a
											href={resolve(`/${data.tenantSlug}/item/${item.id}`)}
											style="border-color: var(--primary-color); color: var(--primary-color);"
											class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-75"
											>Options</a
										>
									{:else}
										<button
											onclick={() => addSimple(item)}
											class="add-btn rounded-lg px-3 py-1.5 text-xs font-medium transition-all {pulsingId ===
											item.id
												? 'pulsing'
												: ''} {lastAddedId === item.id ? 'added' : ''}"
											style={lastAddedId === item.id
												? ''
												: 'background-color: var(--primary-color); color: var(--accent-color);'}
										>
											{lastAddedId === item.id ? '✓ Added' : '+ Add'}
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}

			{#if filteredUncategorized.length > 0}
				<section id="other">
					{#if filteredCategorized.length > 0}
						<h2
							class="mb-4 border-b-2 pb-2 text-lg font-semibold text-gray-800"
							style="border-color: var(--primary-color);"
						>
							Other
						</h2>
					{/if}
					<div class="space-y-3">
						{#each filteredUncategorized as item (item.id)}
							{@const imgs = item.images as { url: string; isPrimary?: boolean }[] | null}
							{@const primaryImage = imgs?.find((i) => i.isPrimary)?.url ?? imgs?.[0]?.url}
							<div
								class="item-card flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								{#if primaryImage}
									<img
										src={primaryImage}
										alt={item.name}
										class="h-20 w-20 shrink-0 rounded-lg object-cover"
									/>
								{/if}
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span
													class="rounded-full px-2 py-0.5 text-xs"
													style="background-color: color-mix(in srgb, var(--secondary-color) 15%, white); color: var(--secondary-color);"
													>{tag}</span
												>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold" style="color: var(--primary-color);">
												${(item.discountedPrice / 100).toFixed(2)}
											</p>
											<p class="text-xs text-gray-400 line-through">
												${(item.price / 100).toFixed(2)}
											</p>
										{:else}
											<p class="font-semibold text-gray-900">${(item.price / 100).toFixed(2)}</p>
										{/if}
									</div>
									{#if hasModifiers(item)}
										<a
											href={resolve(`/${data.tenantSlug}/item/${item.id}`)}
											style="border-color: var(--primary-color); color: var(--primary-color);"
											class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-75"
											>Options</a
										>
									{:else}
										<button
											onclick={() => addSimple(item)}
											class="add-btn rounded-lg px-3 py-1.5 text-xs font-medium transition-all {pulsingId ===
											item.id
												? 'pulsing'
												: ''} {lastAddedId === item.id ? 'added' : ''}"
											style={lastAddedId === item.id
												? ''
												: 'background-color: var(--primary-color); color: var(--accent-color);'}
										>
											{lastAddedId === item.id ? '✓ Added' : '+ Add'}
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/if}
	</main>

	<!-- ── Sticky cart bar ────────────────────────────────────────────────── -->
	{#if cart.count > 0}
		<div class="sticky bottom-0 flex justify-center p-4">
			<a
				href={resolve(
					`/${data.tenantSlug}/cart${tableParam ? `?table=${encodeURIComponent(tableParam)}` : ''}` as `/${string}`
				)}
				style="background-color: var(--primary-color); color: var(--accent-color);"
				class="flex w-full max-w-2xl items-center justify-between rounded-xl px-5 py-3.5 shadow-lg transition-opacity hover:opacity-90"
			>
				<span
					class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
					>{cart.count}</span
				>
				<span class="font-semibold">View Cart</span>
				<span class="font-semibold">${(cart.subtotal / 100).toFixed(2)}</span>
			</a>
		</div>
	{/if}
</div>

<style>
	/* Category nav active + hover */
	.category-pill:hover,
	.category-pill.active {
		background-color: var(--secondary-color);
		color: var(--accent-color);
	}

	/* Item card fade-in stagger */
	@keyframes fadeUp {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.item-card {
		animation: fadeUp 0.3s ease both;
	}

	/* Add button pulse animation */
	@keyframes addPulse {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(1.18);
		}
		100% {
			transform: scale(1);
		}
	}
	.add-btn.pulsing {
		animation: addPulse 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}
	.add-btn.added {
		background-color: #22c55e !important;
		color: #ffffff !important;
	}
</style>
