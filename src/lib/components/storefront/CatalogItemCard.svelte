<script lang="ts">
	import { resolve } from '$app/paths';

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

	// Availability mode → card border color + top "tab". Standard items (no mode /
	// 'both') get the plain gray border and no tab.
	const modeTreatment = $derived.by(() => {
		switch (item.availabilityMode) {
			case 'events_only':
				return {
					label: 'Pickup events',
					border: 'border-1 border-sky-400',
					tab: 'bg-sky-50 text-sky-700'
				};
			case 'storefront_only':
				return {
					label: 'In-store only',
					border: 'border-1 border-amber-300',
					tab: 'bg-amber-50 text-amber-700'
				};
			case 'unlisted':
				return {
					label: 'Unlisted',
					border: 'border-1 border-slate-300',
					tab: 'bg-slate-100 text-slate-700'
				};
			default:
				return null;
		}
	});
	const borderClass = $derived(modeTreatment?.border ?? 'border border-neutral-200');

	// Inline expand/collapse for the description. Only one layout renders per
	// card (image XOR compact), so a single descEl bind is unambiguous.
	let descExpanded = $state(false);
	let descIsTruncated = $state(false);
	let descEl = $state<HTMLParagraphElement | null>(null);

	$effect(() => {
		const el = descEl;
		// Only meaningful while clamped — once expanded, scrollHeight === clientHeight,
		// which would falsely clear the flag. Preserve truncation knowledge while expanded.
		if (!el || descExpanded) return;
		descIsTruncated = el.scrollHeight > el.clientHeight + 1;
	});
</script>

{#snippet actionSlot()}
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
			style="border-color: var(--background-color); color: var(--background-color);">Pick Options</a
		>
	{:else}
		<button
			type="button"
			onclick={onAdd}
			class="add-btn rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-all {isAdding
				? 'pulsing'
				: ''} {wasJustAdded ? 'added' : ''}"
		>
			{wasJustAdded ? '✓ Added' : '+ Add'}
		</button>
	{/if}
{/snippet}

{#snippet descriptionBlock()}
	{#if item.description}
		{#if descExpanded}
			<p bind:this={descEl} class="text-sm text-neutral-600">
				{item.description}<button
					type="button"
					onclick={() => (descExpanded = false)}
					class="ml-1 text-xs font-medium transition-opacity hover:opacity-75"
					style="color: var(--accent-color);">less</button
				>
			</p>
		{:else}
			<div class="relative">
				<p bind:this={descEl} class="line-clamp-2 text-sm text-neutral-600">{item.description}</p>
				{#if descIsTruncated}
					<button
						type="button"
						onclick={() => (descExpanded = true)}
						class="absolute right-0 bottom-0 pl-6 text-xs font-medium"
						style="color: var(--accent-color); background: linear-gradient(to right, transparent, white 1.25rem);"
						>more</button
					>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet topTab()}
	<!-- Availability tab (special modes only), centered over the whole card,
	     straddling its top border. Direct child of the card root. -->
	{#if modeTreatment}
		<span
			class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-0.5 text-xs font-semibold whitespace-nowrap {modeTreatment.tab}"
		>
			{modeTreatment.label}
		</span>
	{/if}
{/snippet}

{#snippet content()}
	<!-- Title -->
	<h3 class="font-semibold text-neutral-900" style="font-family: var(--font-heading);">
		{item.name}
	</h3>

	<!-- Price -->
	{#if item.discountedPrice}
		<p class="mt-0.5 flex items-baseline gap-2">
			<span class="text-lg font-bold text-neutral-900"
				>${(item.discountedPrice / 100).toFixed(2)}</span
			>
			<span class="text-sm text-neutral-500 line-through">${(item.price / 100).toFixed(2)}</span>
		</p>
	{:else}
		<p class="mt-0.5 text-lg font-bold text-neutral-900">${(item.price / 100).toFixed(2)}</p>
	{/if}

	<!-- Action (left-aligned, auto width) -->
	<div class="mt-3">{@render actionSlot()}</div>
{/snippet}
{#snippet description()}
	<!-- Description -->
	{@render descriptionBlock()}
{/snippet}

{#if primaryImage}
	<!-- Image variant: image left, shared content right -->
	<div
		class="relative flex flex-col gap-4 rounded-xl bg-white p-4 transition-shadow hover:shadow-md {borderClass}"
	>
		{@render topTab()}
		<div class="flex gap-4">
			<img
				src={primaryImage}
				alt={item.name}
				class="h-24 w-24 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
			/>
			<div class="relative min-w-0 flex-1">
				{@render content()}
			</div>
		</div>
		{@render description()}
	</div>
{:else}
	<!-- Image-less variant: same content stack at full width -->
	<div
		class="relative flex flex-col gap-4 rounded-xl bg-white p-4 transition-shadow hover:shadow-md {borderClass}"
	>
		{@render topTab()}
		<div class="flex gap-4">
			<div class="relative min-w-0 flex-1">
				{@render content()}
			</div>
		</div>

		{@render description()}
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
