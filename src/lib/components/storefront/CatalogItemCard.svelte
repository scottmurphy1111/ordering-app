<script lang="ts">
	import { resolve } from '$app/paths';
	import StatusBadge from '$lib/components/StatusBadge.svelte';

	type Item = {
		id: number;
		name: string;
		description: string | null;
		price: number;
		discountedPrice: number | null;
		status: string;
		availabilityMode: string | null;
		images: unknown;
		tags: string[] | null;
		modifiers: unknown[];
	};

	let {
		item,
		isPaused,
		isAdding,
		wasJustAdded,
		onAdd
	}: {
		item: Item;
		isPaused: boolean;
		isAdding: boolean;
		wasJustAdded: boolean;
		onAdd: () => void;
	} = $props();

	const imgs = $derived(item.images as { url: string; isPrimary?: boolean }[] | null);
	const primaryImage = $derived(imgs?.find((i) => i.isPrimary)?.url ?? imgs?.[0]?.url ?? null);
	const hasModifiers = $derived(item.modifiers.length > 0);
</script>

{#if primaryImage}
	<!-- Image variant: image left, content right -->
	<div
		class="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md"
	>
		<img
			src={primaryImage}
			alt={item.name}
			class="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-28 sm:w-28"
		/>
		<div class="flex min-w-0 flex-1 flex-col justify-between">
			<div>
				<h3 class="font-semibold text-neutral-900" style="font-family: var(--font-heading);">
					{item.name}
				</h3>
				{#if item.description}
					<p class="mt-1 line-clamp-2 text-sm text-neutral-600">{item.description}</p>
				{/if}
				{#if Array.isArray(item.tags) && item.tags.length > 0}
					<div class="mt-2 flex flex-wrap gap-1">
						{#each item.tags as tag (tag)}
							<span
								class="rounded-full px-2 py-0.5 text-xs capitalize"
								style="background-color: color-mix(in srgb, var(--accent-color) 15%, white); color: var(--accent-color);"
								>{tag.toLowerCase()}</span
							>
						{/each}
					</div>
				{/if}
			</div>
			<div class="mt-3 flex items-end justify-between">
				<div>
					{#if item.discountedPrice}
						<p class="font-semibold text-neutral-900">
							${(item.discountedPrice / 100).toFixed(2)}
						</p>
						<p class="text-xs text-neutral-500 line-through">${(item.price / 100).toFixed(2)}</p>
					{:else}
						<p class="font-semibold text-neutral-900">${(item.price / 100).toFixed(2)}</p>
					{/if}
					{#if item.availabilityMode === 'storefront_only'}
						<StatusBadge tone="bg-amber-50 text-amber-700" class="mt-1 text-xs"
							>Storefront only</StatusBadge
						>
					{:else if item.availabilityMode === 'events_only'}
						<StatusBadge tone="bg-sky-50 text-sky-700" class="mt-1 text-xs">Events only</StatusBadge
						>
					{:else if item.availabilityMode === 'special_order'}
						<StatusBadge tone="bg-purple-50 text-purple-700" class="mt-1 text-xs"
							>Special order</StatusBadge
						>
					{/if}
				</div>
				{#if item.status === 'sold_out'}
					<span class="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700"
						>Sold out</span
					>
				{:else if isPaused}
					<span class="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-400"
						>Unavailable</span
					>
				{:else if hasModifiers}
					<a
						href={resolve(`/item/${item.id}` as `/${string}`)}
						class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-75"
						style="border-color: var(--background-color); color: var(--background-color);"
						>Options</a
					>
				{:else}
					<button
						type="button"
						onclick={onAdd}
						class="add-btn rounded-lg px-3 py-1.5 text-xs font-medium transition-all {isAdding
							? 'pulsing'
							: ''} {wasJustAdded ? 'added' : ''}"
						style="background-color: var(--accent-color); color: var(--accent-foreground);"
					>
						{wasJustAdded ? '✓ Added' : '+ Add'}
					</button>
				{/if}
			</div>
		</div>
	</div>
{:else}
	<!-- Image-less variant: compact text row -->
	<div
		class="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 transition-shadow hover:shadow-md"
	>
		<div class="min-w-0 flex-1">
			<h3 class="font-semibold text-neutral-900" style="font-family: var(--font-heading);">
				{item.name}
			</h3>
			{#if item.description}
				<p class="mt-0.5 line-clamp-1 text-sm text-neutral-600">{item.description}</p>
			{/if}
			{#if Array.isArray(item.tags) && item.tags.length > 0}
				<div class="mt-1 flex flex-wrap gap-1">
					{#each item.tags as tag (tag)}
						<span
							class="rounded-full px-2 py-0.5 text-xs capitalize"
							style="background-color: color-mix(in srgb, var(--accent-color) 15%, white); color: var(--accent-color);"
							>{tag.toLowerCase()}</span
						>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex shrink-0 items-center gap-3">
			<div class="text-right">
				{#if item.discountedPrice}
					<p class="font-semibold text-neutral-900">${(item.discountedPrice / 100).toFixed(2)}</p>
					<p class="text-xs text-neutral-500 line-through">${(item.price / 100).toFixed(2)}</p>
				{:else}
					<p class="font-semibold text-neutral-900">${(item.price / 100).toFixed(2)}</p>
				{/if}
			</div>
			{#if item.status === 'sold_out'}
				<span class="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-700"
					>Sold out</span
				>
			{:else if isPaused}
				<span class="rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-400"
					>Unavailable</span
				>
			{:else if hasModifiers}
				<a
					href={resolve(`/item/${item.id}` as `/${string}`)}
					class="rounded-lg border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-75"
					style="border-color: var(--background-color); color: var(--background-color);">Options</a
				>
			{:else}
				<button
					type="button"
					onclick={onAdd}
					class="add-btn rounded-lg px-3 py-1.5 text-xs font-medium transition-all {isAdding
						? 'pulsing'
						: ''} {wasJustAdded ? 'added' : ''}"
					style="background-color: var(--accent-color); color: var(--accent-foreground);"
				>
					{wasJustAdded ? '✓ Added' : '+ Add'}
				</button>
			{/if}
		</div>
	</div>
{/if}

<style>
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

	.add-btn:hover:not(.added) {
		opacity: 0.82;
	}
	.add-btn.pulsing {
		animation: addPulse 0.35s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
	}
	.add-btn.added {
		background-color: var(--accent-color) !important;
		color: var(--accent-foreground) !important;
		opacity: 0.85;
	}
</style>
