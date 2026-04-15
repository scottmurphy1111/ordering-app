<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { cart } from '$lib/cart.svelte';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.tenantSlug));

	const tenant = $derived(data.tenant);

	const categorized = $derived(
		data.categories
			.map((cat) => ({
				...cat,
				items: data.itemsByCategory[cat.id] ?? []
			}))
			.filter((c) => c.items.length > 0)
	);

	// Items with no category, an inactive category, or a category not in the list
	const visibleCategoryIds = $derived(new Set(data.categories.map((c) => c.id)));
	const uncategorized = $derived(
		data.items.filter((item) => !item.categoryId || !visibleCategoryIds.has(item.categoryId))
	);

	function hasModifiers(item: { modifiers: unknown[] }): boolean {
		return item.modifiers.length > 0;
	}

	function effectivePrice(item: { price: number; discountedPrice: number | null }) {
		return item.discountedPrice ?? item.price;
	}

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
	}
</script>

<svelte:head>
	<title>{tenant.name} — Menu</title>
</svelte:head>

<div class="min-h-screen pb-28">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
		<div class="mx-auto max-w-2xl px-4 py-5">
			{#if tenant.logoUrl}
				<img src={tenant.logoUrl} alt={tenant.name} class="h-12 w-auto max-w-48 object-contain mb-2" />
			{/if}
			<h1 class="text-2xl font-bold text-gray-900">{tenant.name}</h1>
			<p class="mt-0.5 text-sm text-gray-500 capitalize">{tenant.type?.replace('_', ' ')}</p>
		</div>
	</header>

	<main class="mx-auto max-w-2xl space-y-10 px-4 py-8">
		{#if data.items.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<p class="text-gray-400">Menu coming soon.</p>
			</div>
		{:else}
			{#each categorized as category (category.id)}
				<section>
					<h2 class="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-800">
						{category.name}
					</h2>
					<div class="space-y-3">
						{#each category.items as item (item.id)}
							<div
								class="flex justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
													>{tag}</span
												>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold text-green-700">
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
										>
											Options
										</a>
									{:else}
										<button
											onclick={() => addSimple(item)}
											style="background-color: var(--primary-color); color: var(--accent-color);"
											class="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-85"
										>
											+ Add
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}

			{#if uncategorized.length > 0}
				<section>
					{#if categorized.length > 0}
						<h2 class="mb-4 border-b border-gray-200 pb-2 text-lg font-semibold text-gray-800">
							Other
						</h2>
					{/if}
					<div class="space-y-3">
						{#each uncategorized as item (item.id)}
							<div
								class="flex justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
							>
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
													>{tag}</span
												>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold text-green-700">
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
										>
											Options
										</a>
									{:else}
										<button
											onclick={() => addSimple(item)}
											style="background-color: var(--primary-color); color: var(--accent-color);"
											class="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-85"
										>
											+ Add
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
</div>

<!-- Floating cart bar -->
{#if cart.count > 0}
	<div class="fixed right-0 bottom-0 left-0 z-50 flex justify-center p-4">
		<a
			href={resolve(`/${data.tenantSlug}/cart`)}
			style="background-color: var(--primary-color); color: var(--accent-color);"
			class="flex w-full max-w-2xl items-center justify-between rounded-xl px-5 py-3.5 shadow-lg transition-opacity hover:opacity-90"
		>
			<span
				class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold"
			>
				{cart.count}
			</span>
			<span class="font-semibold">View Cart</span>
			<span class="font-semibold">${(cart.subtotal / 100).toFixed(2)}</span>
		</a>
	</div>
{/if}
