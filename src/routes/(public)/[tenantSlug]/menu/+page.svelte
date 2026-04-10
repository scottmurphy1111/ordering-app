<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { cart } from '$lib/cart.svelte';

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
	const uncategorized = $derived(
		data.itemsByCategory['null'] ?? data.itemsByCategory[0 as unknown as string] ?? []
	);

	function hasModifiers(item: { modifiers: unknown }): boolean {
		return Array.isArray(item.modifiers) && (item.modifiers as unknown[]).length > 0;
	}

	function effectivePrice(item: { price: number; discountedPrice: number | null }) {
		return item.discountedPrice ?? item.price;
	}

	function addSimple(item: { id: number; name: number | string; price: number; discountedPrice: number | null; images: unknown }) {
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

<div class="min-h-screen bg-gray-50 pb-28">
	<!-- Header -->
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-2xl px-4 py-6">
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
							<div class="flex justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold text-green-700">${(item.discountedPrice / 100).toFixed(2)}</p>
											<p class="text-xs text-gray-400 line-through">${(item.price / 100).toFixed(2)}</p>
										{:else}
											<p class="font-semibold text-gray-900">${(item.price / 100).toFixed(2)}</p>
										{/if}
									</div>
									{#if hasModifiers(item)}
										<a
											href="/{data.tenantSlug}/item/{item.id}"
											class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
										>
											Options
										</a>
									{:else}
										<button
											onclick={() => addSimple(item)}
											class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
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
							<div class="flex justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
								<div class="min-w-0 flex-1">
									<p class="font-medium text-gray-900">{item.name}</p>
									{#if item.description}
										<p class="mt-0.5 line-clamp-2 text-sm text-gray-500">{item.description}</p>
									{/if}
									{#if Array.isArray(item.tags) && item.tags.length > 0}
										<div class="mt-1.5 flex flex-wrap gap-1">
											{#each item.tags as tag (tag)}
												<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
								<div class="flex shrink-0 flex-col items-end justify-between gap-2">
									<div class="text-right">
										{#if item.discountedPrice}
											<p class="font-semibold text-green-700">${(item.discountedPrice / 100).toFixed(2)}</p>
											<p class="text-xs text-gray-400 line-through">${(item.price / 100).toFixed(2)}</p>
										{:else}
											<p class="font-semibold text-gray-900">${(item.price / 100).toFixed(2)}</p>
										{/if}
									</div>
									{#if hasModifiers(item)}
										<a
											href="/{data.tenantSlug}/item/{item.id}"
											class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
										>
											Options
										</a>
									{:else}
										<button
											onclick={() => addSimple(item)}
											class="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
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
	<div class="fixed bottom-0 left-0 right-0 flex justify-center p-4 z-50">
		<a
			href="/{data.tenantSlug}/cart"
			class="flex w-full max-w-2xl items-center justify-between rounded-xl bg-gray-900 px-5 py-3.5 shadow-lg text-white transition-colors hover:bg-gray-700"
		>
			<span class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
				{cart.count}
			</span>
			<span class="font-semibold">View Cart</span>
			<span class="font-semibold">${(cart.subtotal / 100).toFixed(2)}</span>
		</a>
	</div>
{/if}
