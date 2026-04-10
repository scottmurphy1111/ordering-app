<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { cart, itemUnitPrice } from '$lib/cart.svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => cart.init(data.tenantSlug));

	let customerName = $state('');
	let email = $state('');
	let phone = $state('');
	let notes = $state('');
	let orderType = $state<'pickup' | 'dine-in'>('pickup');
	let loading = $state(false);
	let checkoutError = $state<string | null>(null);

	const TAX_RATE = $derived((data.tenant.settings as { taxRate?: number } | null)?.taxRate ?? 0.0825);
	const subtotal = $derived(cart.subtotal);
	const tax = $derived(Math.round(subtotal * TAX_RATE));
	const total = $derived(subtotal + tax);

	async function checkout() {
		if (cart.items.length === 0) return;
		if (!customerName.trim()) { checkoutError = 'Please enter your name.'; return; }
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
			if (!res.ok) { checkoutError = json.message ?? 'Something went wrong.'; loading = false; return; }

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

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-lg px-4 py-4 flex items-center justify-between">
			<a href="/{data.tenantSlug}/menu" class="text-sm text-gray-500 hover:text-gray-800 transition-colors">
				← Back to menu
			</a>
			<h1 class="text-lg font-semibold text-gray-900">Your Cart</h1>
			<span class="w-20"></span>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-6 space-y-5">
		{#if cart.items.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<p class="text-gray-400 mb-3">Your cart is empty.</p>
				<a href="/{data.tenantSlug}/menu" class="text-sm font-medium text-gray-700 underline hover:text-gray-900">
					Browse the menu
				</a>
			</div>
		{:else}
			<!-- Cart items -->
			<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
				{#each cart.items as item, i (i)}
					<div class="flex items-start gap-3 px-4 py-3 {i > 0 ? 'border-t border-gray-100' : ''}">
						{#if item.imageUrl}
							<img src={item.imageUrl} alt={item.name} class="h-14 w-14 rounded-lg object-cover shrink-0" />
						{/if}
						<div class="flex-1 min-w-0">
							<p class="font-medium text-gray-900 text-sm">{item.name}</p>
							{#if item.selectedModifiers.length > 0}
								<p class="text-xs text-gray-400 mt-0.5">
									{item.selectedModifiers.map((m) => m.name).join(', ')}
								</p>
							{/if}
							<p class="text-xs text-gray-500 mt-0.5">${(itemUnitPrice(item) / 100).toFixed(2)} each</p>
						</div>
						<div class="flex items-center gap-2 shrink-0">
							<button
								onclick={() => cart.decrement(i)}
								class="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
							>−</button>
							<span class="w-4 text-center text-sm font-medium">{item.quantity}</span>
							<button
								onclick={() => cart.increment(i)}
								class="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
							>+</button>
							<button
								onclick={() => cart.remove(i)}
								class="ml-1 text-xs text-red-400 hover:text-red-600 transition-colors"
							>✕</button>
						</div>
					</div>
				{/each}
			</div>

			<!-- Order type -->
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm font-semibold text-gray-800 mb-2">Order type</p>
				<div class="flex gap-3">
					{#each (['pickup', 'dine-in'] as const) as type}
						<label class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors
							{orderType === type ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}">
							<input type="radio" name="orderType" value={type} bind:group={orderType} class="sr-only" />
							{type === 'pickup' ? '🥡 Pickup' : '🍽 Dine-in'}
						</label>
					{/each}
				</div>
			</div>

			<!-- Customer info -->
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
				<p class="text-sm font-semibold text-gray-800">Your details</p>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1" for="cart-name">Name *</label>
					<input
						id="cart-name"
						type="text"
						required
						bind:value={customerName}
						placeholder="Your name"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1" for="cart-email">Email</label>
					<input
						id="cart-email"
						type="email"
						bind:value={email}
						placeholder="for receipt (optional)"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1" for="cart-phone">Phone</label>
					<input
						id="cart-phone"
						type="tel"
						bind:value={phone}
						placeholder="for order updates (optional)"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
					/>
				</div>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1" for="cart-notes">Special instructions</label>
					<textarea
						id="cart-notes"
						bind:value={notes}
						rows="2"
						placeholder="Allergies, preferences…"
						class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 resize-none"
					></textarea>
				</div>
			</div>

			<!-- Order summary -->
			<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-1.5 text-sm">
				<div class="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>${(subtotal / 100).toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-gray-600">
					<span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
					<span>${(tax / 100).toFixed(2)}</span>
				</div>
				<div class="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5 mt-1.5">
					<span>Total</span>
					<span>${(total / 100).toFixed(2)}</span>
				</div>
			</div>

			{#if checkoutError}
				<div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{checkoutError}</div>
			{/if}

			<button
				onclick={checkout}
				disabled={loading || cart.items.length === 0}
				class="w-full rounded-xl bg-gray-900 px-6 py-4 text-base font-semibold text-white shadow-sm transition-colors hover:bg-gray-700 disabled:opacity-50"
			>
				{loading ? 'Redirecting to payment…' : `Pay $${(total / 100).toFixed(2)}`}
			</button>
		{/if}
	</main>
</div>