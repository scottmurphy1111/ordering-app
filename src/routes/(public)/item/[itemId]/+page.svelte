<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import { cart, CartTypeMismatchError, type CartModifier } from '$lib/cart.svelte';
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

	function computeDefaults(): Record<number, Record<number, number>> {
		const initial: Record<number, Record<number, number>> = {};
		for (const group of modifierGroups) {
			initial[group.id] = Object.fromEntries(
				group.options.filter((o) => o.isDefault).map((o) => [o.id, 1])
			);
		}
		return initial;
	}

	// groupId -> { optionId -> quantity }. An option is "selected" when its quantity > 0.
	let selections = $state<Record<number, Record<number, number>>>(computeDefaults());

	function distinctCount(groupId: number): number {
		return Object.values(selections[groupId] ?? {}).filter((q) => q > 0).length;
	}

	// Set an option's quantity (0 removes it). Enforces the group's maxSelections (distinct
	// options) and single-select replace; per-option maxQuantity is clamped by the caller.
	function setOptionQty(group: (typeof modifierGroups)[number], optionId: number, nextQty: number) {
		const current = { ...(selections[group.id] ?? {}) };
		const wasSelected = (current[optionId] ?? 0) > 0;
		const qty = Math.max(0, nextQty);
		if (qty <= 0) {
			delete current[optionId];
		} else {
			if (!wasSelected) {
				if (group.maxSelections === 1) {
					for (const key of Object.keys(current)) delete current[Number(key)];
				} else if (distinctCount(group.id) >= group.maxSelections) {
					return; // at the distinct-option cap
				}
			}
			current[optionId] = qty;
		}
		selections = { ...selections, [group.id]: current };
	}

	const selectedModifiers = $derived<CartModifier[]>(
		modifierGroups.flatMap((group) =>
			Object.entries(selections[group.id] ?? {}).flatMap(([idStr, qty]) => {
				if (qty <= 0) return [];
				const opt = group.options.find((o) => o.id === Number(idStr));
				return opt
					? [
							{
								modifierId: group.id,
								optionId: opt.id,
								group: group.name,
								name: opt.name,
								priceAdjustment: opt.priceAdjustment,
								quantity: qty
							}
						]
					: [];
			})
		)
	);

	const totalPrice = $derived(
		basePrice + selectedModifiers.reduce((s, m) => s + m.priceAdjustment * m.quantity, 0)
	);

	const canAdd = $derived(
		modifierGroups.every(
			(g) => !g.required || Object.values(selections[g.id] ?? {}).some((q) => q > 0)
		)
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
			allowStoreHours: data.item.allowStoreHours ?? undefined,
			allowPickupEvents: data.item.allowPickupEvents ?? undefined,
			allowCustomDate: data.item.allowCustomDate ?? undefined
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
	<!-- Pattern B: back-link breadcrumb + item name -->
	<div class="flex items-center gap-3">
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

	<!-- Image -->
	{#if primaryImage}
		<img
			src={primaryImage.url}
			alt={primaryImage.alt ?? data.item.name}
			class="w-full rounded-xl object-cover shadow-sm"
			style="max-height: 240px;"
		/>
	{/if}

	{#if data.item.description}
		<p class="mb-4 text-sm text-neutral-600">{data.item.description}</p>
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
			{#if data.item.allowStoreHours && !data.item.allowPickupEvents && !data.item.allowCustomDate}
				<StatusBadge tone="bg-amber-50 text-amber-700" class="text-xs">In-store only</StatusBadge>
			{:else if data.item.allowPickupEvents && !data.item.allowStoreHours && !data.item.allowCustomDate}
				<StatusBadge tone="bg-sky-50 text-sky-700" class="text-xs">Pickup events</StatusBadge>
			{:else if data.item.isUnlisted}
				<StatusBadge tone="bg-slate-100 text-slate-700" class="text-xs">Unlisted</StatusBadge>
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
		{@const sel = selections[group.id] ?? {}}
		{@const distinct = Object.values(sel).filter((q) => q > 0).length}
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
						<span class="text-xs text-muted-foreground">{distinct}/{group.maxSelections}</span>
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
					{@const qty = sel[option.id] ?? 0}
					{@const isSelected = qty > 0}
					{@const isStepper = (option.maxQuantity ?? 1) > 1}
					{@const atCap = isMulti && !isSelected && distinct >= group.maxSelections}
					{#if isStepper}
						<div
							style={isSelected
								? 'border-color: var(--background-color); background-color: color-mix(in srgb, var(--background-color) 6%, white);'
								: ''}
							class="flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors"
						>
							<div class="flex items-center gap-3">
								<span class="text-sm text-foreground">{option.name}</span>
								{#if option.isDefault}
									<span
										class="rounded-full px-1.5 py-0.5 text-xs font-medium"
										style="background-color: color-mix(in srgb, var(--accent-color) 15%, white); color: var(--accent-color);"
										>Default</span
									>
								{/if}
								{#if option.priceAdjustment !== 0}
									<span class="text-sm text-muted-foreground">
										{option.priceAdjustment > 0 ? '+' : '−'}${(
											Math.abs(option.priceAdjustment) / 100
										).toFixed(2)} ea
									</span>
								{/if}
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									aria-label="Remove one {option.name}"
									disabled={qty <= 0}
									onclick={() => setOptionQty(group, option.id, qty - 1)}
									class="flex size-7 items-center justify-center rounded-md border text-foreground transition-colors hover:bg-muted/50 disabled:opacity-40"
								>
									−
								</button>
								<span class="w-5 text-center text-sm text-foreground tabular-nums">{qty}</span>
								<button
									type="button"
									aria-label="Add one {option.name}"
									disabled={qty >= (option.maxQuantity ?? 1) || atCap}
									onclick={() => setOptionQty(group, option.id, qty + 1)}
									class="flex size-7 items-center justify-center rounded-md border text-foreground transition-colors hover:bg-muted/50 disabled:opacity-40"
								>
									+
								</button>
							</div>
						</div>
					{:else}
						<label
							style={isSelected
								? 'border-color: var(--background-color); background-color: color-mix(in srgb, var(--background-color) 6%, white);'
								: ''}
							class="flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors
									{isSelected ? '' : ' hover:bg-muted/50'}
									{atCap ? 'cursor-not-allowed opacity-50' : ''}"
						>
							<div class="flex items-center gap-3">
								<input
									type="checkbox"
									checked={isSelected}
									disabled={atCap}
									onchange={() => setOptionQty(group, option.id, isSelected ? 0 : 1)}
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
					{/if}
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
