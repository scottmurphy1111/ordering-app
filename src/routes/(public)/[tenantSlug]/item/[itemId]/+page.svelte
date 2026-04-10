<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { cart, type CartModifier } from '$lib/cart.svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.tenantSlug));

	type ModifierOption = { name: string; priceAdjustment?: number; isDefault?: boolean };
	type ModifierGroup = { name: string; required?: boolean; maxSelections?: number; options: ModifierOption[] };

	const modifierGroups = $derived<ModifierGroup[]>(
		Array.isArray(data.item.modifiers) ? (data.item.modifiers as ModifierGroup[]) : []
	);
	const basePrice = $derived(data.item.discountedPrice ?? data.item.price);
	const images = $derived(
		(data.item.images as { url: string; alt?: string; isPrimary?: boolean }[] | null) ?? []
	);
	const primaryImage = $derived(images.find((i) => i.isPrimary) ?? images[0]);

	// Default selections derived from modifierGroups
	const defaultSelections = $derived(
		Object.fromEntries(
			modifierGroups
				.filter((g) => g.options.some((o) => o.isDefault))
				.map((g) => [g.name, g.options.find((o) => o.isDefault)!.name])
		)
	);

	// User overrides on top of defaults
	let userOverrides = $state<Record<string, string>>({});
	const selections = $derived({ ...defaultSelections, ...userOverrides });

	const selectedModifiers = $derived<CartModifier[]>(
		modifierGroups.flatMap((group) => {
			const chosen = group.options.find((o) => o.name === selections[group.name]);
			if (!chosen) return [];
			return [{ group: group.name, name: chosen.name, priceAdjustment: chosen.priceAdjustment ?? 0 }];
		})
	);

	const totalPrice = $derived(
		basePrice + selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0)
	);

	const canAdd = $derived(
		modifierGroups.every((g) => !g.required || selections[g.name] !== undefined)
	);

	function addToCart() {
		if (!canAdd) return;
		cart.add({
			itemId: data.item.id,
			name: data.item.name,
			basePrice,
			selectedModifiers,
			imageUrl: primaryImage?.url
		});
		goto(`/${data.tenantSlug}/menu`);
	}
</script>

<svelte:head>
	<title>{data.item.name} — {data.tenant.name}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-lg px-4 py-4">
			<a href="/{data.tenantSlug}/menu" class="text-sm text-gray-500 hover:text-gray-800 transition-colors">
				← Back to menu
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6 space-y-6">
		<!-- Image -->
		{#if primaryImage}
			<img
				src={primaryImage.url}
				alt={primaryImage.alt ?? data.item.name}
				class="w-full rounded-xl object-cover shadow-sm"
				style="max-height: 240px;"
			/>
		{/if}

		<!-- Item info -->
		<div>
			<h1 class="text-2xl font-bold text-gray-900">{data.item.name}</h1>
			{#if data.item.description}
				<p class="mt-1 text-gray-500">{data.item.description}</p>
			{/if}
			<div class="mt-2 flex items-center gap-2">
				{#if data.item.discountedPrice}
					<p class="text-xl font-bold text-green-700">${(data.item.discountedPrice / 100).toFixed(2)}</p>
					<p class="text-sm text-gray-400 line-through">${(data.item.price / 100).toFixed(2)}</p>
				{:else}
					<p class="text-xl font-bold text-gray-900">${(data.item.price / 100).toFixed(2)}</p>
				{/if}
			</div>
			{#if Array.isArray(data.item.tags) && data.item.tags.length > 0}
				<div class="mt-2 flex flex-wrap gap-1">
					{#each data.item.tags as tag (tag)}
						<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{tag}</span>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Modifier groups -->
		{#each modifierGroups as group (group.name)}
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between">
					<h2 class="font-semibold text-gray-900">{group.name}</h2>
					{#if group.required}
						<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Required</span>
					{:else}
						<span class="text-xs text-gray-400">Optional</span>
					{/if}
				</div>
				<div class="space-y-2">
					{#each group.options as option (option.name)}
						<label class="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 transition-colors hover:bg-gray-50 {selections[group.name] === option.name ? 'border-gray-900 bg-gray-50' : ''}">
							<div class="flex items-center gap-3">
								<input
									type="radio"
									name={group.name}
									value={option.name}
									checked={selections[group.name] === option.name}
									onchange={() => (userOverrides[group.name] = option.name)}
									class="h-4 w-4 accent-gray-900"
								/>
								<span class="text-sm text-gray-800">{option.name}</span>
							</div>
							{#if option.priceAdjustment && option.priceAdjustment !== 0}
								<span class="text-sm text-gray-500">
									{option.priceAdjustment > 0 ? '+' : ''}{(option.priceAdjustment / 100).toFixed(2)}
								</span>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Allergens -->
		{#if Array.isArray(data.item.allergens) && (data.item.allergens as string[]).length > 0}
			<div class="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
				<span class="font-medium">Allergens:</span>
				{(data.item.allergens as string[]).join(', ')}
			</div>
		{/if}

		<!-- Add to cart -->
		<div class="sticky bottom-4">
			<button
				onclick={addToCart}
				disabled={!canAdd}
				class="w-full rounded-xl bg-gray-900 px-6 py-4 text-base font-semibold text-white shadow-lg transition-colors hover:bg-gray-700 disabled:opacity-50"
			>
				Add to Cart — ${(totalPrice / 100).toFixed(2)}
			</button>
		</div>
	</main>
</div>
