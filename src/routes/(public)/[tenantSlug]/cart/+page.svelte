<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { cart, itemUnitPrice } from '$lib/cart.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.tenantSlug));

	let customerName = $state('');
	let email = $state('');
	let phone = $state('');
	let notes = $state('');
	let orderType = $state<'pickup' | 'dine-in'>('pickup');
	let loading = $state(false);
	let checkoutError = $state<string | null>(null);

	const TAX_RATE = $derived(
		(data.tenant.settings as { taxRate?: number } | null)?.taxRate ?? 0.0825
	);
	const subtotal = $derived(cart.subtotal);
	const tax = $derived(Math.round(subtotal * TAX_RATE));
	const total = $derived(subtotal + tax);

	async function checkout() {
		if (cart.items.length === 0) return;
		if (!customerName.trim()) {
			checkoutError = 'Please enter your name.';
			return;
		}
		checkoutError = null;
		loading = true;

		try {
			const res = await fetch('/api/create-checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tenantSlug: data.tenantSlug,
					items: cart.items,
					customer: { name: customerName, email, phone },
					notes,
					orderType,
					subtotal,
					tax,
					total
				})
			});

			const json = await res.json();
			if (!res.ok) {
				checkoutError = json.message ?? 'Something went wrong.';
				loading = false;
				return;
			}

			cart.clear();
			window.location.href = json.url;
		} catch {
			checkoutError = 'Network error. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Your Cart — {data.tenant.name}</title>
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a
				href={resolve(`/${data.tenantSlug}/menu`)}
				class="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
			>
				<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Back to menu
</a>
			<h1 class="text-lg font-semibold text-gray-900">Your Cart</h1>
			<span class="w-20"></span>
		</div>
	</header>

	<main class="mx-auto max-w-lg space-y-5 px-4 py-6">
		{#if cart.items.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<p class="mb-3 text-gray-400">Your cart is empty.</p>
				<a
					href={resolve(`/${data.tenantSlug}/menu`)}
					class="text-sm font-medium text-gray-700 underline hover:text-gray-900"
				>
					Browse the menu
				</a>
			</div>
		{:else}
			<!-- Cart items -->
			<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				{#each cart.items as item, i (i)}
					<div class="flex items-start gap-3 px-4 py-3 {i > 0 ? 'border-t border-gray-100' : ''}">
						{#if item.imageUrl}
							<img
								src={item.imageUrl}
								alt={item.name}
								class="h-14 w-14 shrink-0 rounded-lg object-cover"
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-gray-900">{item.name}</p>
							{#if item.selectedModifiers.length > 0}
								<p class="mt-0.5 text-xs text-gray-400">
									{item.selectedModifiers.map((m) => m.name).join(', ')}
								</p>
							{/if}
							<p class="mt-0.5 text-xs text-gray-500">
								${(itemUnitPrice(item) / 100).toFixed(2)} each
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<button
								onclick={() => cart.decrement(i)}
								class="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 transition-colors hover:bg-gray-100"
								>−</button
							>
							<span class="w-4 text-center text-sm font-medium">{item.quantity}</span>
							<button
								onclick={() => cart.increment(i)}
								class="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 transition-colors hover:bg-gray-100"
								>+</button
							>
							<button
								onclick={() => cart.remove(i)}
								class="ml-1 text-red-400 transition-colors hover:text-red-600"><Icon icon="mdi:close" class="h-4 w-4" /></button
							>
						</div>
					</div>
				{/each}
			</div>

			<!-- Order type -->
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="mb-2 text-sm font-semibold text-gray-800">Order type</p>
				<div class="flex gap-3">
					{#each ['pickup', 'dine-in'] as const as type (type)}
						<label
							style={orderType === type ? 'background-color: var(--primary-color); color: var(--accent-color); border-color: var(--primary-color);' : ''}
							class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors
							{orderType === type ? '' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}"
						>
							<input
								type="radio"
								name="orderType"
								value={type}
								bind:group={orderType}
								class="sr-only"
							/>
							{#if type === 'pickup'}
									<Icon icon="mdi:bag-personal-outline" class="h-4 w-4" /> Pickup
								{:else}
									<Icon icon="mdi:silverware-fork-knife" class="h-4 w-4" /> Dine-in
								{/if}
						</label>
					{/each}
				</div>
			</div>

			<!-- Customer info -->
			<div class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm font-semibold text-gray-800">Your details</p>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-name">Name *</label>
					<input
						id="cart-name"
						type="text"
						required
						bind:value={customerName}
						placeholder="Your name"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-email">Email</label>
					<input
						id="cart-email"
						type="email"
						bind:value={email}
						placeholder="for receipt (optional)"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-phone">Phone</label>
					<input
						id="cart-phone"
						type="tel"
						bind:value={phone}
						placeholder="for order updates (optional)"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-notes"
						>Special instructions</label
					>
					<textarea
						id="cart-notes"
						bind:value={notes}
						rows="2"
						placeholder="Allergies, preferences…"
						class="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 focus:outline-none"
					></textarea>
				</div>
			</div>

			<!-- Order summary -->
			<div class="space-y-1.5 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
				<div class="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>${(subtotal / 100).toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-gray-600">
					<span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
					<span>${(tax / 100).toFixed(2)}</span>
				</div>
				<div
					class="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 font-semibold text-gray-900"
				>
					<span>Total</span>
					<span>${(total / 100).toFixed(2)}</span>
				</div>
			</div>

			{#if checkoutError}
				<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{checkoutError}
				</div>
			{/if}

			<button
				onclick={checkout}
				disabled={loading || cart.items.length === 0}
				style="background-color: var(--primary-color); color: var(--accent-color);"
				class="w-full rounded-xl px-6 py-4 text-base font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading ? 'Redirecting to payment…' : `Pay $${(total / 100).toFixed(2)}`}
			</button>
		{/if}
	</main>
</div>
