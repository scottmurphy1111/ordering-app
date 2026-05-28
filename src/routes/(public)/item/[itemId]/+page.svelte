<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import {
		cart,
		CartTypeMismatchError,
		type CartModifier,
		type AvailabilityMode
	} from '$lib/cart.svelte';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.vendor.slug));

	const modifierGroups = $derived(data.modifierGroups);
	const isPaused = $derived(!!data.vendor.subscriptionPausedAt);
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

	async function addToCart() {
		if (!canAdd) return;
		const addArgs = {
			itemId: data.item.id,
			name: data.item.name,
			basePrice,
			selectedModifiers,
			imageUrl: primaryImage?.url,
			isSubscription: data.item.isSubscription ?? undefined,
			billingInterval: data.item.billingInterval ?? undefined,
			fulfillmentNote: data.item.fulfillmentNote ?? undefined,
			pickupType: data.item.pickupType,
			customDateLeadDays: data.item.customDateLeadDays ?? undefined,
			availabilityMode: (data.item.availabilityMode as AvailabilityMode | null) ?? undefined
		};

		try {
			cart.add(addArgs);
		} catch (e) {
			if (e instanceof CartTypeMismatchError) {
				const confirmed = await confirmDialog(
					'Wedding cakes and other custom orders are placed separately — they have their own checkout and approval. Start a new cart for this item?',
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
			} else {
				throw e;
			}
		}

		goto(resolve('/catalog' as `/${string}`));
	}
</script>

<svelte:head>
	<title>{data.item.name} — {data.vendor.name}</title>
</svelte:head>

<main class="mx-auto max-w-lg space-y-6 px-4 py-8">
	<!-- Image -->
	{#if primaryImage}
		<img
			src={primaryImage.url}
			alt={primaryImage.alt ?? data.item.name}
			class="w-full rounded-xl object-cover shadow-sm"
			style="max-height: 240px;"
		/>
	{/if}

	<!-- Pattern B: back-link breadcrumb + item name -->
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/catalog' as `/${string}`)}
			class="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Catalog
		</a>
		<span class="text-neutral-300">/</span>
		<h1 class="text-2xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
			{data.item.name}
		</h1>
	</div>

	{#if data.item.description}
		<p class="-mt-3 mb-4 text-sm text-neutral-600">{data.item.description}</p>
	{/if}

	<!-- Item info -->
	<div>
		<div class="flex items-center gap-2">
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
			{#if data.item.availabilityMode === 'storefront_only'}
				<StatusBadge tone="bg-amber-50 text-amber-700" class="text-xs">Storefront only</StatusBadge>
			{:else if data.item.availabilityMode === 'events_only'}
				<StatusBadge tone="bg-sky-50 text-sky-700" class="text-xs">Events only</StatusBadge>
			{:else if data.item.availabilityMode === 'special_order'}
				<StatusBadge tone="bg-purple-50 text-purple-700" class="text-xs">Special order</StatusBadge>
			{/if}
		</div>
		{#if data.item.isSubscription && data.item.fulfillmentNote}
			<div
				class="mt-3 flex items-start gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2"
			>
				<Icon icon="mdi:truck-delivery-outline" class="mt-0.5 h-4 w-4 shrink-0 text-purple-700" />
				<p class="text-xs leading-relaxed text-purple-900">{data.item.fulfillmentNote}</p>
			</div>
		{/if}
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
						<span class="text-xs text-muted-foreground">{chosen.length}/{group.maxSelections}</span>
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
		<div class="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
			<span class="font-medium">Allergens:</span>
			{(data.item.allergens as string[]).join(', ')}
		</div>
	{/if}

	<!-- Add to cart -->
	{#if isPaused}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800"
		>
			<Icon icon="mdi:pause-circle-outline" class="mb-0.5 inline-block h-4 w-4 align-text-bottom" />
			Online ordering is temporarily unavailable. Check back soon.
		</div>
	{:else}
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
	{/if}
</main>
