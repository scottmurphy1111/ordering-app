<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { cart, type CartModifier } from '$lib/cart.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.vendorSlug));

	const modifierGroups = $derived(data.modifierGroups);
	const basePrice = $derived(data.item.discountedPrice ?? data.item.price);
	const images = $derived(
		(data.item.images as { url: string; alt?: string; isPrimary?: boolean }[] | null) ?? []
	);
	const primaryImage = $derived(images.find((i) => i.isPrimary) ?? images[0]);

	function computeDefaults(): Record<number, number[]> {
		const initial: Record<number, number[]> = {};
		for (const group of modifierGroups) {
			initial[group.id] = group.options.filter((o) => o.isDefault).map((o) => o.id);
		}
		return initial;
	}

	let selections = $state<Record<number, number[]>>(computeDefaults());

	function toggleOption(groupId: number, optionId: number, maxSelections: number) {
		const current = selections[groupId] ?? [];
		if (current.includes(optionId)) {
			selections[groupId] = current.filter((id) => id !== optionId);
		} else if (maxSelections === 1) {
			selections[groupId] = [optionId];
		} else if (current.length < maxSelections) {
			selections[groupId] = [...current, optionId];
		}
	}

	const selectedModifiers = $derived<CartModifier[]>(
		modifierGroups.flatMap((group) =>
			(selections[group.id] ?? []).flatMap((id) => {
				const opt = group.options.find((o) => o.id === id);
				return opt
					? [{ group: group.name, name: opt.name, priceAdjustment: opt.priceAdjustment }]
					: [];
			})
		)
	);

	const totalPrice = $derived(
		basePrice + selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0)
	);

	const canAdd = $derived(
		modifierGroups.every((g) => !g.required || (selections[g.id] ?? []).length > 0)
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
		goto(resolve(`/${data.vendorSlug}/catalog`));
	}
</script>

<svelte:head>
	<title>{data.item.name} — {data.vendor.name}</title>
</svelte:head>

<div class="min-h-screen">
	<!-- Branded header -->
	<header style="background-color: var(--background-color);">
		<div class="mx-auto max-w-lg px-4 py-4">
			<a
				href={resolve(`/${data.vendorSlug}/catalog`)}
				class="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-75"
				style="color: var(--foreground-color);"
			>
				<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Back to catalog
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-lg space-y-6 rounded-2xl bg-background/80 px-4 py-6 backdrop-blur-sm">
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
			<h1 class="text-2xl font-bold text-foreground">{data.item.name}</h1>
			{#if data.item.description}
				<p class="mt-1 text-muted-foreground">{data.item.description}</p>
			{/if}
			<div class="mt-2 flex items-center gap-2">
				{#if data.item.discountedPrice}
					<p class="text-xl font-bold" style="color: var(--background-color);">
						${(data.item.discountedPrice / 100).toFixed(2)}
					</p>
					<p class="text-sm text-muted-foreground line-through">
						${(data.item.price / 100).toFixed(2)}
					</p>
				{:else}
					<p class="text-xl font-bold text-foreground">${(data.item.price / 100).toFixed(2)}</p>
				{/if}
			</div>
			{#if Array.isArray(data.item.tags) && data.item.tags.length > 0}
				<div class="mt-2 flex flex-wrap gap-1">
					{#each data.item.tags as tag (tag)}
						<span
							class="rounded-full px-2 py-0.5 text-xs"
							style="background-color: color-mix(in srgb, var(--accent-color) 15%, white); color: var(--accent-color);"
							>{tag}</span
						>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Modifier groups -->
		{#each modifierGroups as group (group.id)}
			{@const chosen = selections[group.id] ?? []}
			{@const isMulti = group.maxSelections > 1}
			<div class="rounded-xl border bg-background p-4 shadow-sm">
				<div class="mb-3 flex items-center justify-between">
					<div>
						<h2 class="font-semibold text-foreground">{group.name}</h2>
						<p class="mt-0.5 text-xs text-muted-foreground">
							{#if isMulti}
								Choose up to {group.maxSelections}
							{:else}
								Choose one
							{/if}
						</p>
					</div>
					<div class="flex items-center gap-2">
						{#if isMulti}
							<span class="text-xs text-muted-foreground"
								>{chosen.length}/{group.maxSelections}</span
							>
						{/if}
						{#if group.required}
							<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600"
								>Required</span
							>
						{:else}
							<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
								>Optional</span
							>
						{/if}
					</div>
				</div>
				<div class="space-y-2">
					{#each group.options as option (option.id)}
						{@const isSelected = chosen.includes(option.id)}
						{@const isDisabled = isMulti && !isSelected && chosen.length >= group.maxSelections}
						<label
							style={isSelected
								? 'border-color: var(--background-color); background-color: color-mix(in srgb, var(--background-color) 6%, white);'
								: ''}
							class="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors
								{isSelected ? '' : ' hover:bg-muted/50'}
								{isDisabled ? 'cursor-not-allowed opacity-50' : ''}"
						>
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									checked={isSelected}
									disabled={isDisabled}
									onchange={() => toggleOption(group.id, option.id, group.maxSelections)}
									style="accent-color: var(--background-color);"
									class="h-4 w-4 rounded"
								/>
								<span class="text-sm text-foreground">{option.name}</span>
								{#if option.isDefault}
									<span
										class="rounded-full px-1.5 py-0.5 text-xs font-medium"
										style="background-color: color-mix(in srgb, var(--accent-color) 15%, white); color: var(--accent-color);"
										>Default</span
									>
								{/if}
							</div>
							{#if option.priceAdjustment !== 0}
								<span class="text-sm text-muted-foreground">
									{option.priceAdjustment > 0 ? '+' : '−'}${(
										Math.abs(option.priceAdjustment) / 100
									).toFixed(2)}
								</span>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/each}

		<!-- Allergens -->
		{#if Array.isArray(data.item.allergens) && (data.item.allergens as string[]).length > 0}
			<div
				class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800"
			>
				<span class="font-medium">Allergens:</span>
				{(data.item.allergens as string[]).join(', ')}
			</div>
		{/if}

		<!-- Add to cart -->
		<div class="sticky bottom-4">
			<button
				type="button"
				onclick={addToCart}
				disabled={!canAdd}
				style="background-color: var(--background-color); color: var(--foreground-color);"
				class="w-full rounded-xl px-6 py-4 text-base font-semibold shadow-lg transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				Add to Cart — ${(totalPrice / 100).toFixed(2)}
			</button>
		</div>
	</main>
</div>
