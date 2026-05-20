<script lang="ts">
	import { resolve } from '$app/paths';
	import { cart, itemUnitPrice } from '$lib/cart.svelte';
	import Icon from '@iconify/svelte';

	let {
		onCheckout
	}: {
		onCheckout?: () => void;
	} = $props();

	function handleCheckout() {
		onCheckout?.();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex items-baseline justify-between pb-4">
		<h2 class="text-lg font-semibold text-neutral-900" style="font-family: var(--font-heading);">
			Your Order
		</h2>
		<span class="text-sm text-neutral-500">
			{cart.count}
			{cart.count === 1 ? 'item' : 'items'}
		</span>
	</div>

	{#if cart.count === 0}
		<!-- Empty state -->
		<div class="flex flex-1 flex-col items-center justify-center py-12 text-center">
			<Icon icon="mdi:basket-outline" class="mb-3 h-10 w-10 text-neutral-300" />
			<p class="text-sm text-neutral-500">Your cart is empty.</p>
			<p class="mt-1 text-xs text-neutral-400">Add items to start your order.</p>
		</div>
	{:else}
		<!-- Item list (scrollable) -->
		<ul class="flex-1 space-y-3 overflow-y-auto pr-1">
			{#each cart.items as item, index (index)}
				{@const lineTotal = itemUnitPrice(item) * item.quantity}
				<li class="flex gap-3 rounded-lg border border-neutral-200 bg-white p-3">
					{#if item.imageUrl}
						<img
							src={item.imageUrl}
							alt={item.name}
							class="h-14 w-14 shrink-0 rounded object-cover"
						/>
					{/if}
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<p class="truncate text-sm font-medium text-neutral-900">{item.name}</p>
							<button
								type="button"
								onclick={() => cart.remove(index)}
								class="shrink-0 text-neutral-400 hover:text-neutral-600"
								aria-label="Remove {item.name}"
							>
								<Icon icon="mdi:close" class="h-4 w-4" />
							</button>
						</div>
						{#if item.selectedModifiers.length > 0}
							<p class="mt-0.5 line-clamp-2 text-xs text-neutral-500">
								{item.selectedModifiers.map((m) => m.name).join(', ')}
							</p>
						{/if}
						<div class="mt-2 flex items-center justify-between">
							<!-- Quantity controls -->
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => cart.decrement(index)}
									class="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900"
									aria-label="Decrease quantity"
								>
									<Icon icon="mdi:minus" class="h-3 w-3" />
								</button>
								<span class="min-w-4 text-center text-sm font-medium text-neutral-900">
									{item.quantity}
								</span>
								<button
									type="button"
									onclick={() => cart.increment(index)}
									class="flex h-6 w-6 items-center justify-center rounded border border-neutral-200 text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900"
									aria-label="Increase quantity"
								>
									<Icon icon="mdi:plus" class="h-3 w-3" />
								</button>
							</div>
							<p class="text-sm font-semibold text-neutral-900">
								${(lineTotal / 100).toFixed(2)}
							</p>
						</div>
					</div>
				</li>
			{/each}
		</ul>

		<!-- Footer: subtotal + CTA -->
		<div class="pt-4">
			<div class="flex items-baseline justify-between">
				<span class="text-sm text-neutral-600">Subtotal</span>
				<span class="text-base font-semibold text-neutral-900">
					${(cart.subtotal / 100).toFixed(2)}
				</span>
			</div>
			<a
				href={resolve('/cart' as `/${string}`)}
				onclick={handleCheckout}
				class="mt-4 block rounded-lg px-4 py-3 text-center text-sm font-semibold transition-opacity hover:opacity-90"
				style="background-color: var(--background-color); color: var(--foreground-color);"
			>
				Checkout
			</a>
		</div>
	{/if}
</div>
