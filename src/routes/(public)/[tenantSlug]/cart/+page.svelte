<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import { cart, itemUnitPrice } from '$lib/cart.svelte';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		cart.init(data.tenantSlug);
		const t = page.url.searchParams.get('table');
		tableParam = t;
		if (t) tableNumber = t;
	});

	let customerName = $state('');
	let email = $state('');
	let phone = $state('');
	let notes = $state('');
	let tableNumber = $state('');
	let tableParam = $state<string | null>(null);
	let orderType = $state<'pickup' | 'delivery'>('pickup');
	let deliveryStreet = $state('');
	let deliveryApt = $state('');
	let deliveryCity = $state('');
	let deliveryState = $state('');
	let deliveryZip = $state('');
	let pickupTiming = $state<'asap' | 'scheduled'>('asap');
	let pickupDate = $state('');
	let pickupTimeValue = $state('');
	let loading = $state(false);
	let checkoutError = $state<string | null>(null);

	// Minimum date (today) and a sensible default time (next 15-min slot + 30 min)
	const today = new SvelteDate().toISOString().split('T')[0];
	function defaultScheduledTime() {
		const d = new SvelteDate();
		d.setMinutes(Math.ceil((d.getMinutes() + 30) / 15) * 15, 0, 0);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	function onScheduledSelect() {
		if (!pickupDate) pickupDate = today;
		if (!pickupTimeValue) pickupTimeValue = defaultScheduledTime();
	}

	const scheduledLabel = $derived.by(() => {
		if (pickupTiming !== 'scheduled' || !pickupDate || !pickupTimeValue) return null;
		const d = new Date(`${pickupDate}T${pickupTimeValue}`);
		return d.toLocaleString(undefined, {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	});

	const settings = $derived(
		data.tenant.settings as {
			taxRate?: number;
			enableTips?: boolean;
			defaultTipPercentages?: number[];
			enableDelivery?: boolean;
			deliveryFee?: number;
		} | null
	);
	const TAX_RATE = $derived(settings?.taxRate ?? 0.0825);
	const tipPercentages = $derived(settings?.defaultTipPercentages ?? [15, 18, 20]);
	const tipsEnabled = $derived(settings?.enableTips !== false);
	const deliveryEnabled = $derived(settings?.enableDelivery === true);
	const tenantDeliveryFee = $derived(settings?.deliveryFee ?? 0);

	let tipPercent = $state<number | 'custom' | 0>(0);
	let customTipDollars = $state('');

	// ── Promo code ──────────────────────────────────────────────────────────
	let promoInput = $state('');
	let promoApplied = $state<{ code: string; discount: number; description: string } | null>(null);
	let promoError = $state<string | null>(null);
	let promoLoading = $state(false);

	async function applyPromo() {
		if (!promoInput.trim()) return;
		promoLoading = true;
		promoError = null;
		try {
			const res = await fetch('/api/validate-promo', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: promoInput.trim(), subtotal: cart.subtotal })
			});
			const json = await res.json();
			if (json.valid) {
				promoApplied = {
					code: promoInput.trim().toUpperCase(),
					discount: json.discount,
					description: json.description
				};
				promoError = null;
			} else {
				promoApplied = null;
				promoError = json.message ?? 'Invalid code.';
			}
		} catch {
			promoError = 'Could not apply code. Please try again.';
		} finally {
			promoLoading = false;
		}
	}

	function removePromo() {
		promoApplied = null;
		promoInput = '';
		promoError = null;
	}

	// Subscription detection
	const isSubscriptionCart = $derived(
		cart.items.length > 0 && cart.items.every((i) => i.isSubscription)
	);
	const hasMixedCart = $derived(
		cart.items.some((i) => i.isSubscription) && cart.items.some((i) => !i.isSubscription)
	);
	const subscriptionInterval = $derived(
		isSubscriptionCart ? (cart.items[0]?.billingInterval ?? 'monthly') : null
	);
	const hasMixedIntervals = $derived(
		isSubscriptionCart && new Set(cart.items.map((i) => i.billingInterval)).size > 1
	);

	const subtotal = $derived(cart.subtotal);
	const tax = $derived(isSubscriptionCart ? 0 : Math.round(subtotal * TAX_RATE));
	const tipCents = $derived.by(() => {
		if (isSubscriptionCart || !tipsEnabled || tipPercent === 0) return 0;
		if (tipPercent === 'custom') return Math.round((parseFloat(customTipDollars) || 0) * 100);
		return Math.round(subtotal * (tipPercent / 100));
	});
	const discountCents = $derived(isSubscriptionCart ? 0 : (promoApplied?.discount ?? 0));
	const deliveryFeeCents = $derived(
		isSubscriptionCart ? 0 : orderType === 'delivery' ? tenantDeliveryFee : 0
	);
	const total = $derived(Math.max(0, subtotal + tax + tipCents + deliveryFeeCents - discountCents));

	async function checkout() {
		if (cart.items.length === 0) return;
		if (hasMixedCart) {
			checkoutError =
				'Remove subscription or one-time items so all items match before checking out.';
			return;
		}
		if (hasMixedIntervals) {
			checkoutError = 'All subscription items must have the same billing interval.';
			return;
		}
		if (!customerName.trim()) {
			checkoutError = 'Please enter your name.';
			return;
		}
		if (orderType === 'delivery' && !deliveryStreet.trim()) {
			checkoutError = 'Please enter a delivery address.';
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
					notes: [tableNumber ? `Table ${tableNumber}` : '', notes].filter(Boolean).join(' | '),
					orderType: isSubscriptionCart ? 'subscription' : orderType,
					deliveryAddress:
						orderType === 'delivery' && !isSubscriptionCart
							? [deliveryStreet, deliveryApt, deliveryCity, deliveryState, deliveryZip]
									.filter(Boolean)
									.join(', ')
							: null,
					scheduledFor:
						pickupTiming === 'scheduled' && pickupDate && pickupTimeValue && !isSubscriptionCart
							? new Date(`${pickupDate}T${pickupTimeValue}`).toISOString()
							: null,
					isSubscription: isSubscriptionCart,
					billingInterval: subscriptionInterval,
					subtotal,
					tax,
					tip: tipCents,
					deliveryFee: deliveryFeeCents,
					discount: discountCents,
					promoCode: promoApplied?.code ?? null,
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
	<!-- Branded header -->
	<header style="background-color: var(--background-color);">
		<div class="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
			<a
				href={resolve(`/${data.tenantSlug}/menu`)}
				class="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-75"
				style="color: var(--foreground-color);"
			>
				<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Back to menu
			</a>
			<div class="flex flex-col items-center gap-1">
				<h1 class="text-lg font-semibold" style="color: var(--foreground-color);">Your Cart</h1>
				{#if tableParam}
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium"
						style="background-color: var(--foreground-color); color: var(--background-color);"
					>
						<Icon icon="mdi:table-chair" class="mr-0.5 inline h-3 w-3" />Table {tableParam}
					</span>
				{/if}
			</div>
			<span class="w-20"></span>
		</div>
	</header>

	<main class="mx-auto my-8 max-w-lg space-y-5 rounded-2xl bg-white/80 px-4 py-6 backdrop-blur-sm">
		{#if cart.items.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
				<p class="mb-3 text-gray-400">Your cart is empty.</p>
				<a
					href={resolve(`/${data.tenantSlug}/menu`)}
					class="text-sm font-medium transition-opacity hover:opacity-75"
					style="color: var(--background-color);"
				>
					Browse the menu
				</a>
			</div>
		{:else}
			{#if hasMixedCart}
				<div
					class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
				>
					<p class="font-medium">Mixed cart not supported</p>
					<p class="mt-0.5 text-xs">
						Subscription items and one-time items can't be ordered together. Please remove one or
						the other.
					</p>
				</div>
			{/if}
			{#if hasMixedIntervals}
				<div
					class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
				>
					<p class="font-medium">Mixed billing intervals</p>
					<p class="mt-0.5 text-xs">
						All subscription items in an order must have the same billing interval (monthly or
						yearly).
					</p>
				</div>
			{/if}

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
							<div class="flex flex-wrap items-center gap-1.5">
								<p class="text-sm font-medium text-gray-900">{item.name}</p>
								{#if item.isSubscription}
									<span
										class="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700"
									>
										<Icon icon="mdi:refresh" class="h-3 w-3" />
										{item.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}
									</span>
								{/if}
							</div>
							{#if item.selectedModifiers.length > 0}
								<p class="mt-0.5 text-xs text-gray-400">
									{item.selectedModifiers.map((m) => m.name).join(', ')}
								</p>
							{/if}
							<p class="mt-0.5 text-xs text-gray-500">
								${(itemUnitPrice(item) / 100).toFixed(2)}{item.isSubscription
									? `/${item.billingInterval === 'yearly' ? 'yr' : 'mo'}`
									: ' each'}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<button
								onclick={() => cart.decrement(i)}
								class="qty-btn flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 transition-colors"
								>−</button
							>
							<span class="w-4 text-center text-sm font-medium">{item.quantity}</span>
							<button
								onclick={() => cart.increment(i)}
								class="qty-btn flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-sm text-gray-600 transition-colors"
								>+</button
							>
							<button
								onclick={() => cart.remove(i)}
								class="ml-1 text-red-400 transition-colors hover:text-red-600"
								><Icon icon="mdi:close" class="h-4 w-4" /></button
							>
						</div>
					</div>
				{/each}
			</div>

			<!-- Order type -->
			{#if deliveryEnabled && !isSubscriptionCart}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p class="mb-2 text-sm font-semibold text-gray-800">Order type</p>
					<div class="flex gap-3">
						{#each [{ value: 'pickup', label: 'Pickup', icon: 'mdi:bag-personal-outline' }, { value: 'delivery', label: 'Delivery', icon: 'mdi:moped-outline' }] as type (type.value)}
							<label
								style={orderType === type.value
									? 'background-color: var(--background-color); color: var(--foreground-color); border-color: var(--background-color);'
									: ''}
								class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors
								{orderType === type.value ? '' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="orderType"
									value={type.value}
									bind:group={orderType}
									class="sr-only"
								/>
								<Icon icon={type.icon} class="h-4 w-4" />
								{type.label}
							</label>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Pickup timing (pickup only) -->
			{#if orderType === 'pickup' && !isSubscriptionCart}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p class="mb-2 text-sm font-semibold text-gray-800">Pickup time</p>
					<div class="flex gap-3">
						{#each [{ value: 'asap', label: 'ASAP', icon: 'mdi:lightning-bolt' }, { value: 'scheduled', label: 'Schedule', icon: 'mdi:calendar-clock' }] as opt (opt.value)}
							<label
								style={pickupTiming === opt.value
									? 'background-color: var(--background-color); color: var(--foreground-color); border-color: var(--background-color);'
									: ''}
								class="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-colors
								{pickupTiming === opt.value ? '' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}"
							>
								<input
									type="radio"
									name="pickupTiming"
									value={opt.value}
									bind:group={pickupTiming}
									onchange={() => {
										if (opt.value === 'scheduled') onScheduledSelect();
									}}
									class="sr-only"
								/>
								<Icon icon={opt.icon} class="h-4 w-4" />
								{opt.label}
							</label>
						{/each}
					</div>

					{#if pickupTiming === 'scheduled'}
						<div class="mt-3 flex gap-2">
							<div class="flex-1">
								<label class="mb-1 block text-xs font-medium text-gray-500" for="pickup-date"
									>Date</label
								>
								<input
									id="pickup-date"
									type="date"
									bind:value={pickupDate}
									min={today}
									class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
								/>
							</div>
							<div class="flex-1">
								<label class="mb-1 block text-xs font-medium text-gray-500" for="pickup-time"
									>Time</label
								>
								<input
									id="pickup-time"
									type="time"
									bind:value={pickupTimeValue}
									step="900"
									class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
								/>
							</div>
						</div>
						{#if scheduledLabel}
							<p class="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
								<Icon icon="mdi:clock-check-outline" class="h-3.5 w-3.5 shrink-0" />
								Scheduled for {scheduledLabel}
							</p>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Delivery address -->
			{#if orderType === 'delivery'}
				<div class="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p class="text-sm font-semibold text-gray-800">Delivery address</p>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="delivery-street"
							>Street address *</label
						>
						<input
							id="delivery-street"
							type="text"
							bind:value={deliveryStreet}
							placeholder="123 Main St"
							class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="delivery-apt"
							>Apt / Suite</label
						>
						<input
							id="delivery-apt"
							type="text"
							bind:value={deliveryApt}
							placeholder="Apt 2B (optional)"
							class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
						/>
					</div>
					<div class="grid grid-cols-3 gap-2">
						<div class="col-span-1">
							<label class="mb-1 block text-xs font-medium text-gray-600" for="delivery-city"
								>City</label
							>
							<input
								id="delivery-city"
								type="text"
								bind:value={deliveryCity}
								class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="delivery-state"
								>State</label
							>
							<input
								id="delivery-state"
								type="text"
								bind:value={deliveryState}
								placeholder="TX"
								class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="delivery-zip"
								>ZIP</label
							>
							<input
								id="delivery-zip"
								type="text"
								bind:value={deliveryZip}
								class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
							/>
						</div>
					</div>
				</div>
			{/if}

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
						class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-email">Email</label>
					<input
						id="cart-email"
						type="email"
						bind:value={email}
						placeholder="for receipt (optional)"
						class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="cart-phone">Phone</label>
					<input
						id="cart-phone"
						type="tel"
						bind:value={phone}
						placeholder="for order updates (optional)"
						class="branded-input w-full rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
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
						class="branded-input w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm transition-colors outline-none"
					></textarea>
				</div>
			</div>

			<!-- Promo code -->
			{#if !isSubscriptionCart}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p class="mb-2 text-sm font-semibold text-gray-800">Promo code</p>
					{#if promoApplied}
						<div
							class="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2"
						>
							<div>
								<p class="font-mono text-sm font-semibold text-green-800">{promoApplied.code}</p>
								<p class="text-xs text-green-600">
									{promoApplied.description} — save ${(promoApplied.discount / 100).toFixed(2)}
								</p>
							</div>
							<button
								type="button"
								onclick={removePromo}
								class="ml-3 text-green-400 hover:text-green-600"
							>
								<Icon icon="mdi:close" class="h-4 w-4" />
							</button>
						</div>
					{:else}
						<div class="flex gap-2">
							<input
								type="text"
								bind:value={promoInput}
								placeholder="Enter code"
								onkeydown={(e) => {
									if (e.key === 'Enter') {
										e.preventDefault();
										applyPromo();
									}
								}}
								class="branded-input flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase transition-colors outline-none"
							/>
							<button
								type="button"
								onclick={applyPromo}
								disabled={promoLoading || !promoInput.trim()}
								class="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
							>
								{promoLoading ? '…' : 'Apply'}
							</button>
						</div>
						{#if promoError}
							<p class="mt-1.5 text-xs text-red-600">{promoError}</p>
						{/if}
					{/if}
				</div>
			{/if}

			<!-- Tip selector -->
			{#if tipsEnabled && !isSubscriptionCart}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<p class="mb-2 text-sm font-semibold text-gray-800">Add a tip</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => {
								tipPercent = 0;
								customTipDollars = '';
							}}
							style={tipPercent === 0
								? 'background-color: var(--background-color); color: var(--foreground-color); border-color: var(--background-color);'
								: ''}
							class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors {tipPercent ===
							0
								? ''
								: 'border-gray-300 text-gray-700 hover:bg-gray-50'}">No tip</button
						>
						{#each tipPercentages as pct (pct)}
							<button
								type="button"
								onclick={() => {
									tipPercent = pct;
									customTipDollars = '';
								}}
								style={tipPercent === pct
									? 'background-color: var(--background-color); color: var(--foreground-color); border-color: var(--background-color);'
									: ''}
								class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors {tipPercent ===
								pct
									? ''
									: 'border-gray-300 text-gray-700 hover:bg-gray-50'}">{pct}%</button
							>
						{/each}
						<button
							type="button"
							onclick={() => {
								tipPercent = 'custom';
							}}
							style={tipPercent === 'custom'
								? 'background-color: var(--background-color); color: var(--foreground-color); border-color: var(--background-color);'
								: ''}
							class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors {tipPercent ===
							'custom'
								? ''
								: 'border-gray-300 text-gray-700 hover:bg-gray-50'}">Custom</button
						>
					</div>
					{#if tipPercent === 'custom'}
						<div class="mt-2 flex items-center gap-1.5">
							<span class="text-sm text-gray-500">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								bind:value={customTipDollars}
								class="branded-input w-28 rounded-lg border border-gray-300 px-3 py-1.5 text-sm transition-colors outline-none"
							/>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Order summary -->
			<div class="space-y-1.5 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
				{#if isSubscriptionCart}
					<div class="mb-1 flex items-center gap-2 border-b border-gray-100 pb-2 text-purple-700">
						<Icon icon="mdi:refresh-circle" class="h-4 w-4 shrink-0" />
						<p class="text-xs font-medium">
							Recurring subscription — billed {subscriptionInterval}
						</p>
					</div>
				{:else if orderType === 'pickup'}
					<div
						class="mb-0.5 flex items-center justify-between border-b border-gray-100 pb-1.5 text-gray-600"
					>
						<span class="flex items-center gap-1.5"
							><Icon icon="mdi:clock-outline" class="h-3.5 w-3.5" /> Pickup</span
						>
						<span class="font-medium">{scheduledLabel ?? 'ASAP'}</span>
					</div>
				{/if}
				<div class="flex justify-between text-gray-600">
					<span
						>{isSubscriptionCart
							? `Per ${subscriptionInterval === 'yearly' ? 'year' : 'month'}`
							: 'Subtotal'}</span
					>
					<span>${(subtotal / 100).toFixed(2)}</span>
				</div>
				{#if !isSubscriptionCart}
					<div class="flex justify-between text-gray-600">
						<span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
						<span>${(tax / 100).toFixed(2)}</span>
					</div>
					{#if deliveryFeeCents > 0}
						<div class="flex justify-between text-gray-600">
							<span>Delivery fee</span>
							<span>${(deliveryFeeCents / 100).toFixed(2)}</span>
						</div>
					{/if}
					{#if tipCents > 0}
						<div class="flex justify-between text-gray-600">
							<span
								>Tip{tipPercent !== 'custom' && tipPercent !== 0 ? ` (${tipPercent}%)` : ''}</span
							>
							<span>${(tipCents / 100).toFixed(2)}</span>
						</div>
					{/if}
					{#if discountCents > 0}
						<div class="flex justify-between font-medium text-green-600">
							<span class="flex items-center gap-1">
								<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
								Promo ({promoApplied?.code})
							</span>
							<span>−${(discountCents / 100).toFixed(2)}</span>
						</div>
					{/if}
				{/if}
				<div
					class="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 font-semibold"
					style="color: var(--background-color);"
				>
					<span
						>{isSubscriptionCart
							? `Total / ${subscriptionInterval === 'yearly' ? 'yr' : 'mo'}`
							: 'Total'}</span
					>
					<span>${(total / 100).toFixed(2)}</span>
				</div>
			</div>

			<p class="text-xs text-gray-400">
				Please double-check your order before paying — changes can't be made once payment is
				submitted.
			</p>

			{#if checkoutError}
				<div class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{checkoutError}
				</div>
			{/if}

			<button
				onclick={checkout}
				disabled={loading || cart.items.length === 0}
				style="background-color: var(--background-color); color: var(--foreground-color);"
				class="w-full rounded-xl px-6 py-4 text-base font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{loading
					? 'Redirecting to payment…'
					: isSubscriptionCart
						? `Subscribe — $${(total / 100).toFixed(2)}/${subscriptionInterval === 'yearly' ? 'yr' : 'mo'}`
						: `Pay $${(total / 100).toFixed(2)}`}
			</button>
		{/if}
	</main>
</div>

<style>
	.branded-input:focus {
		border-color: var(--background-color);
		box-shadow: 0 0 0 1px var(--background-color);
	}

	.qty-btn:hover {
		border-color: var(--background-color);
		color: var(--background-color);
	}
</style>
