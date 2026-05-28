<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate, SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import { cart, itemUnitPrice } from '$lib/cart.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { computeMaxLeadDays } from '$lib/utils/lead-days';
	import { isVendorOpen } from '$lib/hours/isOpen';

	let { data }: { data: PageData } = $props();

	const isPaused = $derived(!!data.vendor.subscriptionPausedAt);

	onMount(() => {
		cart.init(data.vendorSlug);
		validateCart();
	});

	async function validateCart() {
		if (!cart.items.length) return;
		try {
			const res = await fetch('/api/validate-cart', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vendorSlug: data.vendorSlug, items: cart.items })
			});
			if (!res.ok) return;
			const result = await res.json();

			if (result.unavailable?.length) {
				const unavailableIds = new Set(result.unavailable.map((u: { itemId: number }) => u.itemId));
				for (let i = cart.items.length - 1; i >= 0; i--) {
					if (unavailableIds.has(cart.items[i].itemId)) {
						cart.remove(i);
					}
				}
				unavailableItems = result.unavailable;
			}

			priceChanges = result.priceChanges ?? [];
		} catch {
			// Background validation fails silently
		}
	}

	function applyPriceUpdates() {
		for (const change of priceChanges) {
			cart.updateItemPrice(change.itemId, change.currentPrice);
		}
		priceChanges = [];
	}

	let customerName = $state('');
	let email = $state('');
	let phone = $state('');
	let notes = $state('');
	type PickupChoice =
		| { kind: 'asap' }
		| { kind: 'scheduled'; date: string; time: string }
		| { kind: 'event'; windowId: number };

	let pickupChoice = $state<PickupChoice | null>(null);
	let customDateValue = $state('');
	let loading = $state(false);
	let checkoutError = $state<string | null>(null);
	let unavailableItems = $state<{ itemId: number; name: string }[]>([]);
	let priceChanges = $state<
		{ itemId: number; name: string; cartPrice: number; currentPrice: number }[]
	>([]);

	// Minimum date (today) and a sensible default time (next 15-min slot + 30 min)
	const today = new SvelteDate().toISOString().split('T')[0];
	function defaultScheduledTime() {
		const d = new SvelteDate();
		d.setMinutes(Math.ceil((d.getMinutes() + 30) / 15) * 15, 0, 0);
		return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
	}

	const customDateLabel = $derived.by(() => {
		if (!customDateValue) return null;
		const [y, m, d] = customDateValue.split('-').map(Number);
		const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
		return new Intl.DateTimeFormat('en-US', {
			timeZone: data.vendor.timezone,
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(date);
	});

	const settings = $derived(
		data.vendor.settings as {
			taxRate?: number;
			enableTips?: boolean;
			defaultTipPercentages?: number[];
			asapPickupEnabled?: boolean;
		} | null
	);
	const TAX_RATE = $derived(settings?.taxRate ?? 0.0825);
	const tipPercentages = $derived(settings?.defaultTipPercentages ?? [15, 18, 20]);
	const tipsEnabled = $derived(settings?.enableTips === true);
	const asapPickupEnabled = $derived(settings?.asapPickupEnabled === true);

	// Live "is vendor open" — refreshes every 60s so ASAP hides after close
	let now = $state(new Date());
	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60_000);
		return () => clearInterval(interval);
	});

	const fulfillmentModel = $derived(data.vendor.fulfillmentModel);
	const vendorTimezone = $derived(data.vendor.timezone ?? 'America/New_York');

	const vendorOpenState = $derived(
		fulfillmentModel === 'pickup_only'
			? null
			: isVendorOpen(data.hours, data.exceptions, vendorTimezone, now)
	);
	const asapAvailable = $derived(asapPickupEnabled && vendorOpenState?.isOpen === true);

	type PickerOption =
		| { id: string; kind: 'asap'; label: string; sublabel: string }
		| { id: string; kind: 'scheduled'; label: string; sublabel: string }
		| { id: string; kind: 'event'; label: string; sublabel: string; windowId: number };

	const storefrontPickerOptions = $derived.by<PickerOption[]>(() => {
		if (fulfillmentModel !== 'storefront' && fulfillmentModel !== 'hybrid') return [];
		const out: PickerOption[] = [];
		if (asapAvailable) {
			out.push({
				id: 'asap',
				kind: 'asap',
				label: 'ASAP',
				sublabel: 'Order now — pick up during open hours'
			});
		}
		out.push({
			id: 'scheduled',
			kind: 'scheduled',
			label: 'Schedule for later',
			sublabel: 'Pick a time during open hours'
		});
		return out;
	});

	type PickupDate = {
		/** ISO date key in vendor timezone, e.g. '2026-06-14' — used as stable id. */
		dateKey: string;
		/** Short weekday label, e.g. 'Sat'. */
		weekdayLabel: string;
		/** Short date label, e.g. 'Jun 14'. */
		dateLabel: string;
		/** Windows on this date, in start-time order. */
		windows: typeof data.availableWindows;
	};

	const pickupDates = $derived.by<PickupDate[]>(() => {
		if (fulfillmentModel !== 'pickup_only' && fulfillmentModel !== 'hybrid') return [];

		const byDate = new SvelteMap<string, typeof data.availableWindows>();
		for (const win of data.availableWindows) {
			const start = new Date(win.startsAt);
			// en-CA produces YYYY-MM-DD — stable map key and lexicographically sortable.
			const dateKey = start.toLocaleDateString('en-CA', { timeZone: vendorTimezone });
			const existing = byDate.get(dateKey);
			if (existing) {
				existing.push(win);
			} else {
				byDate.set(dateKey, [win]);
			}
		}

		const out: PickupDate[] = [];
		for (const [dateKey, windows] of byDate) {
			const first = new Date(windows[0].startsAt);
			out.push({
				dateKey,
				weekdayLabel: first.toLocaleDateString('en-US', {
					timeZone: vendorTimezone,
					weekday: 'short'
				}),
				dateLabel: first.toLocaleDateString('en-US', {
					timeZone: vendorTimezone,
					month: 'short',
					day: 'numeric'
				}),
				windows
			});
		}
		out.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
		return out;
	});

	const hasStorefrontOptions = $derived(storefrontPickerOptions.length > 0);
	const hasEventDates = $derived(pickupDates.length > 0);
	const hasAnyPickupOption = $derived(hasStorefrontOptions || hasEventDates);

	const showGroupHeaders = $derived(hasStorefrontOptions && hasEventDates);

	// Currently selected date in the chip strip (the event side).
	let selectedDateKey = $state<string | null>(null);

	const selectedDate = $derived(pickupDates.find((d) => d.dateKey === selectedDateKey) ?? null);

	const selectedDateWindows = $derived(selectedDate?.windows ?? []);
	const selectedDateHasMultiple = $derived(selectedDateWindows.length > 1);

	/** True when the selected date's windows span more than one location. */
	const selectedDateMultiLocation = $derived.by(() => {
		const locs = new Set(selectedDateWindows.map((w) => w.location?.name ?? '__none__'));
		return locs.size > 1;
	});

	// Pre-select the nearest date on initial load; auto-commit if single-window.
	$effect(() => {
		if (pickupDates.length > 0 && selectedDateKey === null) {
			const first = pickupDates[0];
			selectedDateKey = first.dateKey;
			if (first.windows.length === 1 && !pickupChoice) {
				pickupChoice = { kind: 'event', windowId: first.windows[0].id };
			}
		}
	});

	function selectDate(dateKey: string) {
		selectedDateKey = dateKey;
		const date = pickupDates.find((d) => d.dateKey === dateKey);
		if (!date) return;
		if (date.windows.length === 1) {
			pickupChoice = { kind: 'event', windowId: date.windows[0].id };
		} else {
			// Multi-window: clear stale event choice if it doesn't belong to this date.
			if (pickupChoice?.kind === 'event') {
				const stillValid = date.windows.some(
					(w) => w.id === (pickupChoice as { windowId: number }).windowId
				);
				if (!stillValid) pickupChoice = null;
			}
		}
	}

	function selectWindow(windowId: number) {
		pickupChoice = { kind: 'event', windowId };
	}

	const currentPickupMode = $derived<'pickup_event' | 'storefront_hours' | 'custom_date' | null>(
		pickupChoice?.kind === 'event'
			? 'pickup_event'
			: pickupChoice?.kind === 'asap' || pickupChoice?.kind === 'scheduled'
				? 'storefront_hours'
				: null
	);

	const incompatibleItemIds = $derived.by<SvelteSet<number>>(() => {
		const mode = currentPickupMode;
		if (!mode) return new SvelteSet();
		const out = new SvelteSet<number>();
		for (const item of cart.items) {
			const am = item.availabilityMode;
			if (!am || am === 'always' || am === 'special_order') continue;
			if (am === 'storefront_only' && mode === 'pickup_event') out.add(item.itemId);
			if (am === 'events_only' && mode === 'storefront_hours') out.add(item.itemId);
		}
		return out;
	});

	const hasIncompatibleItems = $derived(incompatibleItemIds.size > 0);

	function isOptionSelected(option: PickerOption, choice: PickupChoice | null): boolean {
		if (!choice) return false;
		if (choice.kind !== option.kind) return false;
		if (option.kind === 'event' && choice.kind === 'event') {
			return option.windowId === choice.windowId;
		}
		return true;
	}

	function selectOption(option: PickerOption) {
		if (option.kind === 'asap') {
			pickupChoice = { kind: 'asap' };
		} else if (option.kind === 'scheduled') {
			pickupChoice = {
				kind: 'scheduled',
				date: today,
				time: defaultScheduledTime()
			};
		} else if (option.kind === 'event') {
			pickupChoice = { kind: 'event', windowId: option.windowId };
		}
	}

	function fmtWindowDate(d: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: data.vendor.timezone,
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		}).format(d);
	}

	function fmtWindowTime(d: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: data.vendor.timezone,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(d);
	}

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

	// Custom-date cart detection
	const isCustomDateCart = $derived(cart.pickupType === 'custom_date');

	// Lead-days for custom-date min date (max across all items, default 14)
	const maxLeadDays = $derived(computeMaxLeadDays(cart.items));

	// Min/max dates for the custom-date picker, in the vendor's local calendar
	const customDateMin = $derived.by(() => {
		const vendorTodayStr = new Intl.DateTimeFormat('en-CA', {
			timeZone: data.vendor.timezone
		}).format(new Date());
		const [y, m, d] = vendorTodayStr.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1, d + maxLeadDays)).toISOString().slice(0, 10);
	});
	const customDateMax = $derived.by(() => {
		const vendorTodayStr = new Intl.DateTimeFormat('en-CA', {
			timeZone: data.vendor.timezone
		}).format(new Date());
		const [y, m, d] = vendorTodayStr.split('-').map(Number);
		return new Date(Date.UTC(y, m - 1, d + 365)).toISOString().slice(0, 10);
	});

	const customDateInvalid = $derived(
		customDateValue !== '' && (customDateValue < customDateMin || customDateValue > customDateMax)
	);

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
	const total = $derived(Math.max(0, subtotal + tax + tipCents - discountCents));

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
		if (isCustomDateCart) {
			if (!customDateValue) {
				checkoutError = 'Please select a pickup date.';
				return;
			}
			if (customDateValue < customDateMin) {
				checkoutError = `Please select a date at least ${maxLeadDays} days from today.`;
				return;
			}
			if (customDateValue > customDateMax) {
				checkoutError = 'Please select a date within the next year.';
				return;
			}
		} else if (!isSubscriptionCart && hasAnyPickupOption && !pickupChoice) {
			checkoutError = 'Please select a pickup time.';
			return;
		} else if (
			!isSubscriptionCart &&
			pickupChoice?.kind === 'scheduled' &&
			(!pickupChoice.date || !pickupChoice.time)
		) {
			checkoutError = 'Please select a pickup date and time.';
			return;
		}
		checkoutError = null;
		loading = true;

		try {
			if (isCustomDateCart) {
				// Custom-date orders use SetupIntent (no charge until vendor approves)
				const res = await fetch('/api/create-setup-intent', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						vendorSlug: data.vendorSlug,
						items: cart.items,
						customer: { name: customerName, email, phone },
						notes: notes || null,
						scheduledDate: customDateValue,
						subtotal,
						tax,
						total
					})
				});
				const result = await res.json();
				if (!res.ok) {
					if (result.type === 'cart_validation_failed' && result.unavailable?.length) {
						const unavailableIds = new Set(
							result.unavailable.map((u: { itemId: number }) => u.itemId)
						);
						for (let i = cart.items.length - 1; i >= 0; i--) {
							if (unavailableIds.has(cart.items[i].itemId)) cart.remove(i);
						}
						unavailableItems = result.unavailable;
						checkoutError = null;
					} else {
						checkoutError = result.message ?? 'Something went wrong.';
					}
					loading = false;
					return;
				}
				await goto(resolve(`/checkout?orderId=${result.orderId}` as `/${string}`));
				cart.clear();
			} else {
				const commonPayload = {
					vendorSlug: data.vendorSlug,
					items: cart.items,
					customer: { name: customerName, email, phone },
					notes: notes || null,
					orderType: isSubscriptionCart ? 'subscription' : 'pickup',
					pickupMode: isSubscriptionCart
						? 'pickup_event'
						: pickupChoice?.kind === 'asap' || pickupChoice?.kind === 'scheduled'
							? 'storefront_hours'
							: 'pickup_event',
					scheduledFor:
						!isSubscriptionCart &&
						pickupChoice?.kind === 'scheduled' &&
						pickupChoice.date &&
						pickupChoice.time
							? new Date(`${pickupChoice.date}T${pickupChoice.time}`).toISOString()
							: null,
					pickupWindowId:
						!isSubscriptionCart && pickupChoice?.kind === 'event' ? pickupChoice.windowId : null,
					subtotal,
					tax,
					tip: tipCents,
					discount: discountCents,
					promoCode: promoApplied?.code ?? null,
					total
				};

				if (isSubscriptionCart) {
					// Subscriptions use Stripe Checkout (hosted page)
					const res = await fetch('/api/create-checkout', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							...commonPayload,
							isSubscription: true,
							billingInterval: subscriptionInterval
						})
					});
					const result = await res.json();
					if (!res.ok) {
						if (result.type === 'cart_validation_failed' && result.unavailable?.length) {
							const unavailableIds = new Set(
								result.unavailable.map((u: { itemId: number }) => u.itemId)
							);
							for (let i = cart.items.length - 1; i >= 0; i--) {
								if (unavailableIds.has(cart.items[i].itemId)) cart.remove(i);
							}
							unavailableItems = result.unavailable;
							checkoutError = null;
						} else {
							checkoutError = result.message ?? 'Something went wrong.';
						}
						loading = false;
						return;
					}
					window.location.href = result.url;
					cart.clear();
				} else {
					// Windowed one-time orders use Payment Element checkout
					const res = await fetch('/api/create-payment-intent', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(commonPayload)
					});
					const result = await res.json();
					if (!res.ok) {
						if (result.type === 'cart_validation_failed' && result.unavailable?.length) {
							const unavailableIds = new Set(
								result.unavailable.map((u: { itemId: number }) => u.itemId)
							);
							for (let i = cart.items.length - 1; i >= 0; i--) {
								if (unavailableIds.has(cart.items[i].itemId)) cart.remove(i);
							}
							unavailableItems = result.unavailable;
							checkoutError = null;
						} else {
							checkoutError = result.message ?? 'Something went wrong.';
						}
						loading = false;
						return;
					}
					await goto(resolve(`/checkout?orderId=${result.orderId}` as `/${string}`));
					cart.clear();
				}
			}
		} catch {
			checkoutError = 'Network error. Please try again.';
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Your Cart — {data.vendor.name}</title>
</svelte:head>

<main class="mx-auto max-w-lg space-y-4 px-4 py-8">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
			Your Cart
		</h1>
	</div>
	{#if isPaused}
		<div
			class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800"
		>
			<Icon icon="mdi:pause-circle-outline" class="mb-0.5 inline-block h-4 w-4 align-text-bottom" />
			Online ordering is temporarily unavailable. Check back soon.
		</div>
	{/if}

	{#if unavailableItems.length > 0}
		<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="font-medium">
						{unavailableItems.length === 1 ? 'An item was removed' : 'Some items were removed'}
					</p>
					<p class="mt-0.5 text-xs">
						{unavailableItems.map((i) => i.name).join(', ')}
						{unavailableItems.length === 1 ? 'is' : 'are'} no longer available and
						{unavailableItems.length === 1 ? 'has' : 'have'} been removed from your cart.
					</p>
				</div>
				<button
					type="button"
					onclick={() => {
						unavailableItems = [];
					}}
					class="shrink-0 text-amber-500 hover:text-amber-700"
					aria-label="Dismiss"
				>
					<Icon icon="mdi:close" class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/if}

	{#if priceChanges.length > 0}
		<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
			<div class="flex items-start justify-between gap-2">
				<div>
					<p class="font-medium">
						{priceChanges.length === 1 ? 'A price has changed' : 'Some prices have changed'}
					</p>
					<ul class="mt-0.5 space-y-0.5 text-xs">
						{#each priceChanges as change (change.itemId)}
							<li>
								{change.name}: ${(change.cartPrice / 100).toFixed(2)} → ${(
									change.currentPrice / 100
								).toFixed(2)}
							</li>
						{/each}
					</ul>
				</div>
			</div>
			<div class="mt-2 flex gap-2">
				<button
					type="button"
					onclick={applyPriceUpdates}
					class="rounded-md border border-amber-300 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-200"
				>
					Update cart
				</button>
				<button
					type="button"
					onclick={() => {
						priceChanges = [];
					}}
					class="rounded-md border border-amber-200 bg-transparent px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
				>
					Dismiss
				</button>
			</div>
		</div>
	{/if}

	{#if hasIncompatibleItems}
		<div class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
			Some items in your cart aren't available for the selected pickup method. Remove them or choose
			a different pickup option to continue.
		</div>
	{/if}

	{#if checkoutError}
		<div
			class="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{checkoutError}
		</div>
	{/if}

	{#if cart.items.length === 0}
		<div class="rounded-xl border border-dashed p-12 text-center">
			<p class="mb-3 text-muted-foreground">Your cart is empty.</p>
			<a
				href={resolve('/catalog' as `/${string}`)}
				class="text-sm font-medium transition-opacity hover:opacity-75"
				style="color: var(--background-color);"
			>
				Browse the catalog
			</a>
		</div>
	{:else}
		{#if hasMixedCart}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
				<p class="font-medium">Mixed cart not supported</p>
				<p class="mt-0.5 text-xs">
					Subscription items and one-time items can't be ordered together. Please remove one or the
					other.
				</p>
			</div>
		{/if}
		{#if hasMixedIntervals}
			<div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
				<p class="font-medium">Mixed billing intervals</p>
				<p class="mt-0.5 text-xs">
					All subscription items in an order must have the same billing interval (monthly or
					yearly).
				</p>
			</div>
		{/if}

		<!-- Cart items -->
		<Card class="shadow-sm">
			<CardContent class="p-0">
				{#each cart.items as item, i (i)}
					<div class="flex items-start gap-3 px-4 py-3 {i > 0 ? 'border-t ' : ''}">
						{#if item.imageUrl}
							<img
								src={item.imageUrl}
								alt={item.name}
								class="h-14 w-14 shrink-0 rounded-lg object-cover"
							/>
						{/if}
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-1.5">
								<p class="text-sm font-medium text-foreground">{item.name}</p>
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
								<p class="mt-0.5 text-xs text-muted-foreground">
									{item.selectedModifiers.map((m) => m.name).join(', ')}
								</p>
							{/if}
							<p class="mt-0.5 text-xs text-muted-foreground">
								${(itemUnitPrice(item) / 100).toFixed(2)}{item.isSubscription
									? `/${item.billingInterval === 'yearly' ? 'yr' : 'mo'}`
									: ' each'}
							</p>
							{#if incompatibleItemIds.has(item.itemId)}
								<p class="mt-1 text-xs font-medium text-amber-600">
									{item.availabilityMode === 'storefront_only'
										? 'Storefront pickup only — not available at events'
										: 'Event pickup only — not available for storefront orders'}
								</p>
							{/if}
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<button
								type="button"
								onclick={() => cart.decrement(i)}
								class="qty-btn flex h-6 w-6 items-center justify-center rounded-full border text-sm text-muted-foreground transition-colors"
								>−</button
							>
							<span class="w-4 text-center text-sm font-medium">{item.quantity}</span>
							<button
								type="button"
								onclick={() => cart.increment(i)}
								class="qty-btn flex h-6 w-6 items-center justify-center rounded-full border text-sm text-muted-foreground transition-colors"
								>+</button
							>
							<button
								type="button"
								onclick={() => cart.remove(i)}
								class="ml-1 text-red-400 transition-colors hover:text-red-600"
								><Icon icon="mdi:close" class="h-4 w-4" /></button
							>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<!-- Pickup timing / date selection -->
		{#if !isSubscriptionCart}
			{#if isCustomDateCart}
				<Card class="shadow-sm">
					<CardContent class="p-4">
						<p class="mb-2 text-sm font-semibold text-foreground">Pickup date</p>
						<p class="mb-3 text-sm text-muted-foreground">
							Pick a date for your order. We'll review your request and confirm before charging your
							card.
						</p>
						<div>
							<label class="mb-1 block text-xs font-medium text-muted-foreground" for="custom-date"
								>Date *</label
							>
							<input
								id="custom-date"
								type="date"
								bind:value={customDateValue}
								min={customDateMin}
								max={customDateMax}
								class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none {customDateInvalid
									? 'border-destructive'
									: ''}"
							/>
							{#if customDateInvalid}
								{#if customDateValue < customDateMin}
									<p class="mt-1.5 text-xs text-destructive">
										Please pick a date at least {maxLeadDays} days from today.
									</p>
								{:else}
									<p class="mt-1.5 text-xs text-destructive">
										Please pick a date within the next year.
									</p>
								{/if}
							{:else}
								<p class="mt-1.5 text-xs text-muted-foreground">
									Available {maxLeadDays}+ days from today.
								</p>
							{/if}
						</div>
					</CardContent>
				</Card>
			{:else}
				{#snippet pickerOptionRow(option: PickerOption)}
					{@const isSelected = isOptionSelected(option, pickupChoice)}
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all {isSelected
							? ''
							: 'hover:bg-muted/30'}"
						style={isSelected
							? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent;'
							: ''}
					>
						<input
							type="radio"
							name="pickupChoice"
							checked={isSelected}
							onchange={() => selectOption(option)}
							class="sr-only"
						/>
						<div
							class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
							style={isSelected
								? 'border-color: var(--accent-color); background-color: var(--accent-color);'
								: 'border-color: #d1d5db;'}
						>
							{#if isSelected}
								<div
									class="h-1.5 w-1.5 rounded-full"
									style="background-color: var(--accent-foreground);"
								></div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="flex items-center gap-1.5 text-sm font-medium text-foreground">
								{#if option.kind === 'asap'}
									<Icon icon="mdi:lightning-bolt" class="h-3.5 w-3.5 shrink-0 text-amber-500" />
								{:else if option.kind === 'scheduled'}
									<Icon
										icon="mdi:calendar-clock"
										class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
									/>
								{/if}
								{option.label}
							</p>
							<p class="mt-0.5 text-xs text-muted-foreground">{option.sublabel}</p>
						</div>
					</label>
					{#if option.kind === 'scheduled' && pickupChoice?.kind === 'scheduled'}
						<div class="ml-7 flex gap-2 pb-1">
							<div class="flex-1">
								<label
									class="mb-1 block text-xs font-medium text-muted-foreground"
									for="pickup-date">Date</label
								>
								<input
									id="pickup-date"
									type="date"
									bind:value={pickupChoice.date}
									min={today}
									class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
								/>
							</div>
							<div class="flex-1">
								<label
									class="mb-1 block text-xs font-medium text-muted-foreground"
									for="pickup-time">Time</label
								>
								<input
									id="pickup-time"
									type="time"
									bind:value={pickupChoice.time}
									step="900"
									class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
								/>
							</div>
						</div>
					{:else if option.kind === 'event'}
						{@const win = data.availableWindows.find((w) => w.id === option.windowId)}
						{#if win}
							{@const isFull = win.remainingCapacity !== null && win.remainingCapacity <= 0}
							{@const isLow =
								win.remainingCapacity !== null &&
								win.remainingCapacity > 0 &&
								win.remainingCapacity <= 5}
							{#if win.notes}
								<p class="ml-7 text-xs text-muted-foreground">{win.notes}</p>
							{/if}
							{#if isFull}
								<span
									class="ml-7 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
									>Full</span
								>
							{:else if isLow}
								<span
									class="ml-7 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600"
									>{win.remainingCapacity} left</span
								>
							{/if}
						{/if}
					{/if}
				{/snippet}

				{#snippet windowCard(
					win: (typeof data.availableWindows)[number],
					isSelected: boolean,
					showLocation: boolean
				)}
					{@const startLabel = fmtWindowTime(new Date(win.startsAt))}
					{@const endLabel = fmtWindowTime(new Date(win.endsAt))}
					{@const isFull = win.remainingCapacity !== null && win.remainingCapacity <= 0}
					{@const isLow =
						win.remainingCapacity !== null &&
						win.remainingCapacity > 0 &&
						win.remainingCapacity <= 5}
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all {isSelected
							? ''
							: 'hover:bg-muted/30'}"
						style={isSelected
							? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent;'
							: ''}
					>
						<input
							type="radio"
							name="pickupWindow"
							checked={isSelected}
							onchange={() => selectWindow(win.id)}
							class="sr-only"
						/>
						<div
							class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
							style={isSelected
								? 'border-color: var(--accent-color); background-color: var(--accent-color);'
								: 'border-color: #d1d5db;'}
						>
							{#if isSelected}
								<div
									class="h-1.5 w-1.5 rounded-full"
									style="background-color: var(--accent-foreground);"
								></div>
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-foreground">{startLabel} – {endLabel}</p>
							{#if showLocation && win.location}
								<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
									<Icon icon="mdi:map-marker-outline" class="h-3 w-3 shrink-0" />
									{win.location.name}
								</p>
							{/if}
							{#if win.notes}
								<p class="mt-0.5 text-xs text-muted-foreground">{win.notes}</p>
							{/if}
							{#if isFull}
								<span
									class="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
									>Full</span
								>
							{:else if isLow}
								<span
									class="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600"
									>{win.remainingCapacity} left</span
								>
							{/if}
						</div>
					</label>
				{/snippet}

				{#snippet singleWindowConfirm(win: (typeof data.availableWindows)[number])}
					{@const startLabel = fmtWindowTime(new Date(win.startsAt))}
					{@const endLabel = fmtWindowTime(new Date(win.endsAt))}
					{@const isLow =
						win.remainingCapacity !== null &&
						win.remainingCapacity > 0 &&
						win.remainingCapacity <= 5}
					<div
						class="flex items-start gap-3 rounded-lg border p-3"
						style="box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent;"
					>
						<Icon
							icon="mdi:check-circle"
							class="mt-0.5 h-5 w-5 shrink-0"
							style="color: var(--accent-color);"
						/>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-foreground">{startLabel} – {endLabel}</p>
							{#if win.location}
								<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
									<Icon icon="mdi:map-marker-outline" class="h-3 w-3 shrink-0" />
									{win.location.name}
								</p>
							{/if}
							{#if win.notes}
								<p class="mt-0.5 text-xs text-muted-foreground">{win.notes}</p>
							{/if}
							{#if isLow}
								<span
									class="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600"
									>{win.remainingCapacity} left</span
								>
							{/if}
						</div>
					</div>
					<p class="mt-1.5 px-1 text-xs text-muted-foreground">
						One pickup that day — selected automatically.
					</p>
				{/snippet}

				<Card class="shadow-sm">
					<CardContent class="p-4">
						<p class="mb-2 text-sm font-semibold text-foreground">Pickup time</p>

						{#if !hasAnyPickupOption}
							<p class="text-sm text-muted-foreground">
								No pickup options are currently available. Check back soon.
							</p>
						{:else}
							<div class="space-y-4">
								{#if hasStorefrontOptions}
									<div class="space-y-2">
										{#if showGroupHeaders}
											<p
												class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
											>
												Pick up at the storefront
											</p>
										{/if}
										{#each storefrontPickerOptions as option (option.id)}
											{@render pickerOptionRow(option)}
										{/each}
									</div>
								{/if}

								{#if hasStorefrontOptions && hasEventDates}
									<div class="flex items-center gap-3 py-1">
										<div class="h-px flex-1 bg-border"></div>
										<span class="text-xs text-muted-foreground">or</span>
										<div class="h-px flex-1 bg-border"></div>
									</div>
								{/if}

								{#if hasEventDates}
									<div class="space-y-3">
										{#if showGroupHeaders}
											<p
												class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
											>
												Choose a pickup event
											</p>
										{/if}

										<!-- Date chip strip. padding-right keeps the last chip from sitting flush
                         to the right edge, implying scrollability without visible chrome. -->
										<div
											class="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5"
											style="scrollbar-width: thin; padding-right: 2rem;"
										>
											{#each pickupDates as date (date.dateKey)}
												{@const isSelected = selectedDateKey === date.dateKey}
												<button
													type="button"
													onclick={() => selectDate(date.dateKey)}
													class="flex shrink-0 flex-col items-center rounded-lg border px-3.5 py-2.5 transition-all"
													style={isSelected
														? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent; background-color: color-mix(in srgb, var(--accent-color) 10%, transparent);'
														: 'border-color: #e5e7eb;'}
												>
													<span
														class="text-xs"
														style={isSelected ? 'color: var(--accent-color);' : 'color: #6b7280;'}
														>{date.weekdayLabel}</span
													>
													<span
														class="text-sm font-medium"
														style={isSelected ? 'color: var(--accent-color);' : ''}
														>{date.dateLabel}</span
													>
												</button>
											{/each}
										</div>

										{#if selectedDate}
											{#if selectedDateHasMultiple}
												<p class="text-sm text-muted-foreground">
													{selectedDateWindows.length} pickups on {selectedDate.weekdayLabel}
													{selectedDate.dateLabel} — pick one:
												</p>
												<div class="space-y-2">
													{#each selectedDateWindows as win (win.id)}
														{@const isWinSelected =
															pickupChoice?.kind === 'event' && pickupChoice.windowId === win.id}
														{@render windowCard(win, isWinSelected, selectedDateMultiLocation)}
													{/each}
												</div>
											{:else if selectedDateWindows.length === 1}
												{@render singleWindowConfirm(selectedDateWindows[0])}
											{/if}
										{/if}
									</div>
								{/if}
							</div>
						{/if}
					</CardContent>
				</Card>
			{/if}
		{/if}

		<!-- Customer info -->
		<Card class="shadow-sm">
			<CardContent class="space-y-3 p-4">
				<p class="text-sm font-semibold text-foreground">Your details</p>
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground" for="cart-name"
						>Name *</label
					>
					<input
						id="cart-name"
						type="text"
						required
						bind:value={customerName}
						placeholder="Your name"
						class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground" for="cart-email"
						>Email</label
					>
					<input
						id="cart-email"
						type="email"
						bind:value={email}
						placeholder="for receipt (optional)"
						class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground" for="cart-phone"
						>Phone</label
					>
					<input
						id="cart-phone"
						type="tel"
						bind:value={phone}
						placeholder="for order updates (optional)"
						class="branded-input w-full rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
					/>
				</div>
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground" for="cart-notes"
						>Special instructions</label
					>
					<textarea
						id="cart-notes"
						bind:value={notes}
						rows="2"
						placeholder="Pickup notes, dietary needs, birthday message, etc."
						class="branded-input w-full resize-none rounded-lg border px-3 py-2 text-sm transition-colors outline-none"
					></textarea>
				</div>
			</CardContent>
		</Card>

		<!-- Promo code -->
		{#if !isSubscriptionCart && !isCustomDateCart}
			<Card class="shadow-sm">
				<CardContent class="p-4">
					<p class="mb-2 text-sm font-semibold text-foreground">Promo code</p>
					{#if promoApplied}
						<div
							class="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-3 py-2"
						>
							<div>
								<p class="font-mono text-sm font-semibold text-primary">{promoApplied.code}</p>
								<p class="text-xs text-primary">
									{promoApplied.description} — save ${(promoApplied.discount / 100).toFixed(2)}
								</p>
							</div>
							<button
								type="button"
								onclick={removePromo}
								class="ml-3 text-primary/70 hover:text-primary"
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
								class="branded-input flex-1 rounded-lg border px-3 py-2 text-sm uppercase transition-colors outline-none"
							/>
							<button
								type="button"
								onclick={applyPromo}
								disabled={promoLoading || !promoInput.trim()}
								class="rounded-lg border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 disabled:opacity-50"
							>
								{promoLoading ? '…' : 'Apply'}
							</button>
						</div>
						{#if promoError}
							<p class="mt-1.5 text-xs text-red-600">{promoError}</p>
						{/if}
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- Tip selector -->
		{#if tipsEnabled && !isSubscriptionCart && !isCustomDateCart}
			<Card class="shadow-sm">
				<CardContent class="p-4">
					<p class="mb-2 text-sm font-semibold text-foreground">Add a tip</p>
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => {
								tipPercent = 0;
								customTipDollars = '';
							}}
							style={tipPercent === 0
								? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent; color: var(--accent-color);'
								: ''}
							class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-all {tipPercent ===
							0
								? ''
								: ' text-muted-foreground hover:bg-muted/50'}">No tip</button
						>
						{#each tipPercentages as pct (pct)}
							<button
								type="button"
								onclick={() => {
									tipPercent = pct;
									customTipDollars = '';
								}}
								style={tipPercent === pct
									? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent; color: var(--accent-color);'
									: ''}
								class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-all {tipPercent ===
								pct
									? ''
									: ' text-muted-foreground hover:bg-muted/50'}">{pct}%</button
							>
						{/each}
						<button
							type="button"
							onclick={() => {
								tipPercent = 'custom';
							}}
							style={tipPercent === 'custom'
								? 'box-shadow: 0 0 0 2px var(--accent-color); border-color: transparent; color: var(--accent-color);'
								: ''}
							class="rounded-lg border px-3 py-1.5 text-sm font-medium transition-all {tipPercent ===
							'custom'
								? ''
								: ' text-muted-foreground hover:bg-muted/50'}">Custom</button
						>
					</div>
					{#if tipPercent === 'custom'}
						<div class="mt-2 flex items-center gap-1.5">
							<span class="text-sm text-muted-foreground">$</span>
							<input
								type="number"
								min="0"
								step="0.01"
								placeholder="0.00"
								bind:value={customTipDollars}
								class="branded-input w-28 rounded-lg border px-3 py-1.5 text-sm transition-colors outline-none"
							/>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- Order summary -->
		<Card class="shadow-sm">
			<CardContent class="space-y-1.5 p-4 text-sm">
				{#if isSubscriptionCart}
					<div class="mb-1 flex items-center gap-2 border-b pb-2 text-purple-700">
						<Icon icon="mdi:refresh-circle" class="h-4 w-4 shrink-0" />
						<p class="text-xs font-medium">
							Recurring subscription — billed {subscriptionInterval}
						</p>
					</div>
				{:else if isCustomDateCart}
					<div
						class="mb-0.5 flex items-center justify-between border-b pb-1.5 text-muted-foreground"
					>
						<span class="flex items-center gap-1.5">
							<Icon icon="mdi:calendar-clock" class="h-3.5 w-3.5" /> Requested date
						</span>
						<span class="font-medium">{customDateLabel || '—'}</span>
					</div>
				{:else}
					<div
						class="mb-0.5 flex items-center justify-between border-b pb-1.5 text-muted-foreground"
					>
						<span class="flex items-center gap-1.5"
							><Icon icon="mdi:clock-outline" class="h-3.5 w-3.5" /> Pickup</span
						>
						<span class="font-medium">
							{#if pickupChoice?.kind === 'event'}
								{@const win = data.availableWindows.find(
									(w) => w.id === (pickupChoice as { kind: 'event'; windowId: number }).windowId
								)}
								{#if win}{fmtWindowDate(win.startsAt)} · {fmtWindowTime(win.startsAt)}{/if}
							{:else if pickupChoice?.kind === 'scheduled' && pickupChoice.date && pickupChoice.time}
								{new Date(`${pickupChoice.date}T${pickupChoice.time}`).toLocaleString(undefined, {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit'
								})}
							{:else}
								ASAP
							{/if}
						</span>
					</div>
				{/if}
				<div class="flex justify-between text-muted-foreground">
					<span
						>{isSubscriptionCart
							? `Per ${subscriptionInterval === 'yearly' ? 'year' : 'month'}`
							: 'Subtotal'}</span
					>
					<span>${(subtotal / 100).toFixed(2)}</span>
				</div>
				{#if !isSubscriptionCart}
					<div class="flex justify-between text-muted-foreground">
						<span>Tax ({(TAX_RATE * 100).toFixed(2)}%)</span>
						<span>${(tax / 100).toFixed(2)}</span>
					</div>
					{#if tipCents > 0}
						<div class="flex justify-between text-muted-foreground">
							<span
								>Tip{tipPercent !== 'custom' && tipPercent !== 0 ? ` (${tipPercent}%)` : ''}</span
							>
							<span>${(tipCents / 100).toFixed(2)}</span>
						</div>
					{/if}
					{#if discountCents > 0}
						<div class="flex justify-between font-medium text-primary">
							<span class="flex items-center gap-1">
								<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
								Promo ({promoApplied?.code})
							</span>
							<span>−${(discountCents / 100).toFixed(2)}</span>
						</div>
					{/if}
				{/if}
				<div
					class="mt-1.5 flex justify-between border-t pt-1.5 font-semibold"
					style="color: var(--background-color);"
				>
					<span>
						{isSubscriptionCart
							? `Total / ${subscriptionInterval === 'yearly' ? 'yr' : 'mo'}`
							: isCustomDateCart
								? 'Estimated total'
								: 'Total'}
					</span>
					<span>${(total / 100).toFixed(2)}</span>
				</div>
				{#if isCustomDateCart}
					<p class="mt-1 text-xs text-muted-foreground">
						We'll charge this amount only after we approve your request.
					</p>
				{/if}
			</CardContent>
		</Card>

		<p class="text-xs text-muted-foreground">
			{#if isCustomDateCart}
				Please double-check your request. Your payment method will be saved but not charged until we
				approve.
			{:else}
				Please double-check your order before paying — changes can't be made once payment is
				submitted.
			{/if}
		</p>

		<button
			type="button"
			onclick={checkout}
			disabled={loading || cart.items.length === 0 || isPaused || hasIncompatibleItems}
			style="background-color: var(--accent-color); color: var(--accent-foreground);"
			class="w-full rounded-xl px-6 py-4 text-base font-semibold shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
		>
			{#if loading}
				{isCustomDateCart ? 'Setting up payment…' : 'Redirecting to payment…'}
			{:else if isSubscriptionCart}
				Subscribe — ${(total / 100).toFixed(2)}/{subscriptionInterval === 'yearly' ? 'yr' : 'mo'}
			{:else if isCustomDateCart}
				Continue to payment setup
			{:else}
				Pay ${(total / 100).toFixed(2)}
			{/if}
		</button>
	{/if}
</main>

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
