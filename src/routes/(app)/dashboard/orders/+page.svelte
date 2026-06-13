<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { invalidate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { formatDistanceToNow } from 'date-fns';
	import Icon from '@iconify/svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import OrdersTabs from '$lib/components/OrdersTabs.svelte';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import OrdersFilterTabs from '$lib/components/OrdersFilterTabs.svelte';
	import { SvelteURLSearchParams, SvelteMap } from 'svelte/reactivity';
	import { Alert } from '$lib/components/ui/alert';
	import OrderStatusStepper from '$lib/components/OrderStatusStepper.svelte';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { startVisiblePolling } from '$lib/polling';

	let { data }: { data: PageData } = $props();
	let rowActionError = $state<string | null>(null);
	let mounted = $state(false);
	let soundEnabled = $state(true);
	let prevOrderCount = $state(-1);
	let copiedId = $state<number | null>(null);
	let submittingRowAction = $state<{ id: number; action: 'cancel' | 'refund' } | null>(null);

	onMount(() => {
		mounted = true;
		soundEnabled = localStorage.getItem('ol_sound') !== 'false';
		return startVisiblePolling(() => invalidate('app:orders'), 60_000);
	});

	// Total order count across all groups (for chime detection)
	const totalOrderCount = $derived(
		data.view === 'production'
			? 0
			: data.windowGroups.reduce((s, g) => s + g.orders.length, 0) + data.freeFormOrders.length
	);

	$effect(() => {
		const count = totalOrderCount;
		if (prevOrderCount === -1) {
			prevOrderCount = count;
		} else if (count > prevOrderCount) {
			playChime();
			prevOrderCount = count;
		} else {
			prevOrderCount = count;
		}
	});

	function toggleSound() {
		soundEnabled = !soundEnabled;
		localStorage.setItem('ol_sound', soundEnabled ? 'true' : 'false');
	}

	function playChime() {
		if (!soundEnabled) return;
		try {
			const ctx = new AudioContext();
			[523.25, 659.25, 783.99].forEach((freq, i) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.type = 'sine';
				osc.frequency.value = freq;
				gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.06);
				gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.4);
				osc.start(ctx.currentTime + i * 0.06);
				osc.stop(ctx.currentTime + i * 0.06 + 0.45);
			});
		} catch {
			/* browser may block without user gesture */
		}
	}

	function copyOrderNumber(e: Event, id: number, num: string) {
		e.stopPropagation();
		navigator.clipboard.writeText(num).then(() => {
			copiedId = id;
			setTimeout(() => {
				copiedId = null;
			}, 1500);
		});
	}

	const statuses = [
		'',
		'scheduled',
		'pending_approval',
		'received',
		'confirmed',
		'preparing',
		'ready',
		'fulfilled',
		'cancelled'
	];
	const statusLabels: Record<string, string> = {
		'': 'All',
		scheduled: 'Scheduled',
		received: 'Received',
		confirmed: 'Confirmed',
		preparing: 'Preparing',
		ready: 'Ready',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled',
		pending_approval: 'Pending approval',
		payment_failed: 'Payment failed'
	};
	const filterIcons: Record<string, string> = {
		'': '',
		scheduled: 'mdi:calendar-clock',
		pending_approval: 'mdi:gavel',
		received: 'mdi:inbox-arrow-down',
		confirmed: 'mdi:check-circle-outline',
		preparing: 'mdi:progress-wrench',
		ready: 'mdi:package-variant-closed',
		fulfilled: 'mdi:flag-checkered',
		cancelled: 'mdi:close-circle'
	};
	const totalActiveCount = $derived(Object.values(data.statusCounts).reduce((a, b) => a + b, 0));
	const needsAction = $derived(
		(data.statusCounts['received'] ?? 0) + (data.statusCounts['ready'] ?? 0)
	);
	const inProgress = $derived(
		(data.statusCounts['confirmed'] ?? 0) + (data.statusCounts['preparing'] ?? 0)
	);

	let searchQuery = $state('');

	function matchesSearch(o: {
		orderNumber: string;
		customerName: string | null;
		customerPhone: string | null;
	}) {
		if (!searchQuery.trim()) return true;
		const q = searchQuery.toLowerCase();
		return (
			o.orderNumber.toLowerCase().includes(q) ||
			(o.customerName ?? '').toLowerCase().includes(q) ||
			(o.customerPhone ?? '').toLowerCase().includes(q)
		);
	}

	function tabCount(s: string): number {
		return s === '' ? totalActiveCount : (data.statusCounts[s] ?? 0);
	}

	const urgentStatuses = new Set(['received', 'ready', 'pending_approval']);

	// ── Vendor timezone ─────────────────────────────────────────────────────────
	const vendorTimezone = $derived(data.vendor?.timezone ?? 'America/New_York');

	// Day key (YYYY-MM-DD) in the vendor's timezone — avoids the UTC-slice off-by-one in
	// the evening, when UTC has already rolled to the next day.
	const dayKeyTz = (d: Date) =>
		new Intl.DateTimeFormat('en-CA', {
			timeZone: vendorTimezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(d);

	function fmtWindowDate(d: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: vendorTimezone,
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(d);
	}

	function fmtWindowTime(d: Date): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: vendorTimezone,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(d);
	}

	// ── View toggle URLs ─────────────────────────────────────────────────────────
	const viewOrdersUrl = $derived.by(() => {
		const params = new SvelteURLSearchParams();
		if (data.statusFilter) params.set('status', data.statusFilter);
		if (data.view === 'orders' && data.showCancelled) params.set('cancelled', 'show');
		const qs = params.toString();
		return qs ? `/dashboard/orders?${qs}` : '/dashboard/orders';
	});

	const cancelledToggleUrl = $derived.by(() => {
		const params = new SvelteURLSearchParams();
		if (data.statusFilter) params.set('status', data.statusFilter);
		if (data.view === 'orders' && !data.showCancelled) params.set('cancelled', 'show');
		const qs = params.toString();
		return qs ? `/dashboard/orders?${qs}` : '/dashboard/orders';
	});

	// ── Production view: day/window grouping ────────────────────────────────────
	const groupMode = $derived(
		data.view === 'production' ? (page.url.searchParams.get('group') ?? 'day') : 'day'
	);

	// Window-less units (custom-date + storefront) — not shown in "By window".
	const scheduledUnits = $derived(
		data.view === 'production'
			? data.scheduledProduction.reduce((sum, sp) => sum + sp.totalQuantity, 0) +
					data.storefrontProduction.reduce((sum, sf) => sum + sf.totalQuantity, 0)
			: 0
	);

	type ProductionDay = {
		dateKey: string;
		dateLabel: string;
		windowCount: number;
		totalUnits: number;
		items: Array<{
			name: string;
			modifiers: string[];
			totalQuantity: number;
			pickupLabel?: string;
			overdue?: boolean;
			hasNew?: boolean;
		}>;
	};

	const productionDays = $derived.by<ProductionDay[]>(() => {
		if (data.view !== 'production') return [];
		const dayMap = new SvelteMap<string, ProductionDay>();

		for (const group of data.productionGroups) {
			const date = new Date(group.window.startsAt);
			const dateKey = dayKeyTz(date);
			const dateLabel = new Intl.DateTimeFormat('en-US', {
				timeZone: vendorTimezone,
				weekday: 'long',
				month: 'long',
				day: 'numeric'
			}).format(date);

			if (!dayMap.has(dateKey)) {
				dayMap.set(dateKey, { dateKey, dateLabel, windowCount: 0, totalUnits: 0, items: [] });
			}
			const day = dayMap.get(dateKey)!;
			day.windowCount += 1;

			for (const item of group.items) {
				const modifierKey = item.modifiers.slice().sort().join('|');
				const existing = day.items.find(
					(it) => it.name === item.name && it.modifiers.slice().sort().join('|') === modifierKey
				);
				if (existing) {
					existing.totalQuantity += item.totalQuantity;
					existing.hasNew = existing.hasNew || item.hasNew;
				} else {
					day.items.push({
						name: item.name,
						modifiers: item.modifiers,
						totalQuantity: item.totalQuantity,
						hasNew: item.hasNew
					});
				}
				day.totalUnits += item.totalQuantity;
			}
		}

		// Fold in custom-date production (no pickup window): date each item to its
		// prep-start day = scheduledFor − leadDays, clamped to today (earlier dates are
		// flagged overdue). Day key matches the windowed path (UTC date slice).
		const todayKey = dayKeyTz(new Date());
		const dayLabelFmt = new Intl.DateTimeFormat('en-US', {
			timeZone: vendorTimezone,
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		});
		const pickupLabelFmt = new Intl.DateTimeFormat('en-US', {
			timeZone: vendorTimezone,
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
		for (const sp of data.scheduledProduction) {
			// Non-mutating date shift (scheduledFor is noon-UTC anchored, so subtracting
			// whole days keeps it noon-UTC). Avoids a mutated Date per svelte/prefer-svelte-reactivity.
			const baseMs = new Date(sp.scheduledFor).getTime();
			let dateKey = dayKeyTz(new Date(baseMs - sp.leadDays * 86_400_000));
			let overdue = false;
			if (dateKey < todayKey) {
				dateKey = todayKey;
				overdue = true;
			}
			if (!dayMap.has(dateKey)) {
				dayMap.set(dateKey, {
					dateKey,
					dateLabel: dayLabelFmt.format(new Date(`${dateKey}T12:00:00Z`)),
					windowCount: 0,
					totalUnits: 0,
					items: []
				});
			}
			const day = dayMap.get(dateKey)!;
			day.items.push({
				name: sp.itemName,
				modifiers: sp.modifiers,
				totalQuantity: sp.totalQuantity,
				pickupLabel: pickupLabelFmt.format(new Date(sp.scheduledFor)),
				overdue,
				hasNew: sp.hasNew
			});
			day.totalUnits += sp.totalQuantity;
		}

		// Fold in storefront-hours production (no window, no lead time): prep day is the
		// pickup day, clamped to today with past dates flagged overdue.
		for (const sf of data.storefrontProduction) {
			let dateKey = dayKeyTz(new Date(sf.scheduledFor));
			let overdue = false;
			if (dateKey < todayKey) {
				dateKey = todayKey;
				overdue = true;
			}
			if (!dayMap.has(dateKey)) {
				dayMap.set(dateKey, {
					dateKey,
					dateLabel: dayLabelFmt.format(new Date(`${dateKey}T12:00:00Z`)),
					windowCount: 0,
					totalUnits: 0,
					items: []
				});
			}
			const day = dayMap.get(dateKey)!;
			day.items.push({
				name: sf.itemName,
				modifiers: sf.modifiers,
				totalQuantity: sf.totalQuantity,
				pickupLabel: pickupLabelFmt.format(new Date(sf.scheduledFor)),
				overdue,
				hasNew: sf.hasNew
			});
			day.totalUnits += sf.totalQuantity;
		}

		for (const day of dayMap.values()) {
			day.items.sort((a, b) => b.totalQuantity - a.totalQuantity || a.name.localeCompare(b.name));
		}

		return Array.from(dayMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
	});

	// ── Production week/day pager ──────────────────────────────────────────────
	// Desktop shows the Sun–Sat week containing the anchor and steps a week at a time;
	// mobile shows a single day and steps a day. Keys are UTC date strings to match
	// productionDays' dateKey.
	let anchorKey = $state(dayKeyTz(new Date()));
	let isMobile = $state(false);

	$effect(() => {
		const mq = window.matchMedia('(max-width: 767px)');
		isMobile = mq.matches;
		const onChange = (e: MediaQueryListEvent) => (isMobile = e.matches);
		mq.addEventListener('change', onChange);
		return () => mq.removeEventListener('change', onChange);
	});

	const pagerRange = $derived.by(() => {
		const base = Date.parse(`${anchorKey}T00:00:00Z`);
		if (isMobile) return { start: anchorKey, end: anchorKey };
		const dow = new Date(base).getUTCDay(); // 0=Sun … 6=Sat
		const start = new Date(base - dow * 86_400_000).toISOString().slice(0, 10);
		const end = new Date(base + (6 - dow) * 86_400_000).toISOString().slice(0, 10);
		return { start, end };
	});

	const visibleDays = $derived(
		productionDays.filter((d) => d.dateKey >= pagerRange.start && d.dateKey <= pagerRange.end)
	);

	const pagerLabel = $derived.by(() => {
		const fmt = (key: string, opts: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat('en-US', { timeZone: vendorTimezone, ...opts }).format(
				new Date(`${key}T12:00:00Z`)
			);
		return isMobile
			? fmt(anchorKey, { weekday: 'long', month: 'short', day: 'numeric' })
			: `${fmt(pagerRange.start, { month: 'short', day: 'numeric' })} – ${fmt(pagerRange.end, { month: 'short', day: 'numeric' })}`;
	});

	function pagerStep(dir: number) {
		const base = Date.parse(`${anchorKey}T00:00:00Z`);
		anchorKey = new Date(base + dir * (isMobile ? 1 : 7) * 86_400_000).toISOString().slice(0, 10);
	}
	function pagerToday() {
		anchorKey = dayKeyTz(new Date());
	}
</script>

<div>
	<!-- Header -->
	<div class="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
		<h1 class="text-2xl font-bold text-gray-900">Orders</h1>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon"
				onclick={toggleSound}
				title={soundEnabled ? 'Mute new order alerts' : 'Enable new order alerts'}
			>
				<Icon
					icon={soundEnabled ? 'mdi:bell-outline' : 'mdi:bell-off-outline'}
					class="h-4 w-4 {soundEnabled ? 'text-primary' : 'text-gray-400'}"
				/>
			</Button>
			<OrdersTabs />
		</div>
	</div>

	{#if rowActionError}
		<Alert severity="error" class="mb-4">{rowActionError}</Alert>
	{/if}

	<!-- Orders / Production view toggle -->
	<div class="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between print:hidden">
		<Tabs
			value={data.view === 'production' ? 'production' : 'orders'}
			onValueChange={(v) =>
				goto(
					resolve(
						v === 'production'
							? '/dashboard/orders?view=production'
							: (viewOrdersUrl as `/${string}`)
					)
				)}
		>
			<TabsList class="bg-stone-200" aria-label="Orders view">
				<TabsTrigger value="orders">
					<Icon icon="mdi:format-list-bulleted" class="h-3.5 w-3.5" />
					Orders
				</TabsTrigger>
				<TabsTrigger value="production">
					<Icon icon="mdi:clipboard-list-outline" class="h-3.5 w-3.5" />
					Production
					{#if data.newOrderCount > 0}
						<span
							class="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-semibold text-white"
						>
							{data.newOrderCount}
						</span>
					{/if}
				</TabsTrigger>
			</TabsList>
		</Tabs>
		{#if data.view !== 'production'}
			<Button href={resolve(cancelledToggleUrl as `/${string}`)} variant="ghost">
				{data.view === 'orders' && data.showCancelled ? 'Hide cancelled' : 'Show cancelled'}
			</Button>
		{/if}
	</div>

	<!-- Summary bar -->
	{#if mounted}
		<div class="print:hidden">
			<OrdersSummaryBar
				compact
				stats={[
					{ label: 'Needs action', value: needsAction, urgent: needsAction > 0 },
					{ label: 'In progress', value: inProgress },
					{ label: 'Scheduled', value: data.scheduledCount },
					{ label: "Today's revenue", value: `$${(data.todayRevenue / 100).toFixed(2)}` }
				]}
			/>
		</div>
	{/if}

	{#if data.view === 'production'}
		<!-- ── Production view ──────────────────────────────────────────────── -->
		{#if data.productionGroups.length === 0 && data.scheduledProduction.length === 0 && data.storefrontProduction.length === 0}
			<Card>
				<CardContent class="flex flex-col items-center py-12 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
						<Icon icon="mdi:clipboard-list-outline" class="h-7 w-7 text-muted-foreground/50" />
					</div>
					<h3 class="mt-4 text-base font-semibold text-foreground">Nothing to prep yet</h3>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						Once customers place orders for upcoming pickup windows, you'll see what to prep here.
					</p>
				</CardContent>
			</Card>
		{:else}
			<!-- Production toolbar: grouping toggle + print -->
			<div class="production-toolbar mb-4 flex items-center justify-between print:hidden">
				<div
					class="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-0.5"
				>
					<a
						href={resolve('/dashboard/orders?view=production')}
						class="rounded-md px-3 py-1 text-xs font-medium transition-colors {groupMode === 'day'
							? 'bg-gray-900 text-white'
							: 'text-gray-500 hover:text-gray-900'}"
					>
						By day
					</a>
					<a
						href={resolve('/dashboard/orders?view=production&group=window')}
						class="rounded-md px-3 py-1 text-xs font-medium transition-colors {groupMode ===
						'window'
							? 'bg-gray-900 text-white'
							: 'text-gray-500 hover:text-gray-900'}"
					>
						By window
					</a>
				</div>
				<button
					type="button"
					onclick={() => window.print()}
					class="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					<Icon icon="mdi:printer-outline" class="h-3.5 w-3.5" />
					Print
				</button>
			</div>

			<!-- Print-only header (hidden on screen, visible when printing) -->
			<div class="hidden print:mb-6 print:block">
				<h1 class="text-xl font-bold text-gray-900">Production list</h1>
				<p class="text-sm text-gray-500">
					{data.vendor?.name ?? ''} · Printed {new Date().toLocaleDateString([], {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
						year: 'numeric'
					})}
				</p>
			</div>

			<div class="space-y-6">
				{#if groupMode === 'day'}
					<!-- Week (desktop) / day (mobile) pager -->
					<div class="flex items-center justify-between gap-2">
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => pagerStep(-1)}
								class="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
								aria-label="Previous"
							>
								<Icon icon="mdi:chevron-left" class="h-4 w-4" />
							</button>
							<button
								type="button"
								onclick={pagerToday}
								class="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
							>
								Today
							</button>
							<button
								type="button"
								onclick={() => pagerStep(1)}
								class="flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50"
								aria-label="Next"
							>
								<Icon icon="mdi:chevron-right" class="h-4 w-4" />
							</button>
						</div>
						<p class="text-sm font-medium text-gray-700">{pagerLabel}</p>
					</div>
					{#if visibleDays.length === 0}
						<div
							class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-500"
						>
							Nothing to prep {isMobile ? 'this day' : 'this week'}.
						</div>
					{:else}
						{#each visibleDays as day (day.dateKey)}
							<Card class="gap-0 py-0">
								<CardContent class="p-0">
									<div class="border-b border-gray-100 px-4 py-3">
										<p class="text-sm font-semibold text-gray-900">{day.dateLabel}</p>
										<p class="mt-0.5 text-xs text-gray-500">
											{day.totalUnits}
											{day.totalUnits === 1 ? 'item' : 'items'} to prep{#if day.windowCount > 0}
												· {day.windowCount}
												pickup {day.windowCount === 1 ? 'window' : 'windows'}{/if}
										</p>
									</div>
									<table class="w-full">
										<tbody class="divide-y divide-gray-50">
											{#each day.items as item, i (i)}
												<tr>
													<td class="px-4 py-3 text-sm text-gray-900">
														{#if item.hasNew}<span
																class="mr-1.5 inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white"
																>New</span
															>{/if}{item.name}{#if item.modifiers.length > 0}<span
																class="text-gray-500"
															>
																— {item.modifiers.join(', ')}</span
															>{/if}
														{#if item.pickupLabel}
															<span
																class="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
															>
																picking up {item.pickupLabel}
															</span>
														{/if}
														{#if item.overdue}
															<span
																class="ml-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
															>
																overdue
															</span>
														{/if}
													</td>
													<td class="px-4 py-3 text-right">
														<span class="font-mono text-sm font-semibold text-gray-900">
															{item.totalQuantity}
														</span>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</CardContent>
							</Card>
						{/each}
					{/if}
				{:else}
					{#each data.productionGroups as group (group.window.windowId)}
						<Card class="gap-0 py-0">
							<CardContent class="p-0">
								<div class="border-b border-gray-100 px-4 py-3">
									<p class="text-sm font-semibold text-gray-900">
										{fmtWindowDate(group.window.startsAt)} · {fmtWindowTime(
											group.window.startsAt
										)}–{fmtWindowTime(group.window.endsAt)}
										{#if group.window.locationName}
											· <span class="font-normal text-gray-500">{group.window.locationName}</span>
										{/if}
									</p>
									<p class="mt-0.5 text-xs text-gray-500">
										{group.orderCount}
										{group.orderCount === 1 ? 'order' : 'orders'}
									</p>
								</div>
								<table class="w-full">
									<tbody class="divide-y divide-gray-50">
										{#each group.items as item, i (i)}
											<tr>
												<td class="px-4 py-3 text-sm text-gray-900">
													{#if item.hasNew}<span
															class="mr-1.5 inline-flex items-center rounded-full bg-green-600 px-2 py-0.5 text-xs font-semibold text-white"
															>New</span
														>{/if}{item.name}{#if item.modifiers.length > 0}<span
															class="text-gray-500"
														>
															— {item.modifiers.join(', ')}</span
														>{/if}
												</td>
												<td class="px-4 py-3 text-right">
													<span class="font-mono text-sm font-semibold text-gray-900">
														{item.totalQuantity}
													</span>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</CardContent>
						</Card>
					{/each}
					{#if scheduledUnits > 0}
						<a
							href={resolve('/dashboard/orders?view=production')}
							class="block rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500 transition-colors hover:text-gray-900"
						>
							+ {scheduledUnits}
							{scheduledUnits === 1 ? 'item' : 'items'} to prep not shown here —
							<span class="font-medium text-gray-700">switch to By day</span>
						</a>
					{/if}
				{/if}
			</div>
		{/if}
	{:else}
		<!-- ── Orders view ───────────────────────────────────────────────────── -->

		<!-- Row 1: Search -->
		<div class="relative mb-3 w-full">
			<Icon
				icon="mdi:magnify"
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
			/>
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="Search by order #, customer name, or phone…"
				class="border-foreground/10 bg-background pr-4 pl-9 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/20"
			/>
		</div>

		<!-- Row 2: Filter tabs -->
		<div class="mb-5">
			<OrdersFilterTabs
				tabs={statuses.map((s) => ({
					label: statusLabels[s],
					value: s,
					count: tabCount(s),
					dot: urgentStatuses.has(s),
					icon: filterIcons[s]
				}))}
				active={data.statusFilter}
				onchange={(val) => {
					const params = new SvelteURLSearchParams();
					if (val) params.set('status', val);
					if (val === 'cancelled' || data.showCancelled) params.set('cancelled', 'show');
					const qs = params.toString();
					goto(resolve(qs ? `/dashboard/orders?${qs}` : '/dashboard/orders'));
				}}
			/>
		</div>

		{#if !mounted}
			<div class="space-y-3">
				{#each [0, 1, 2, 3] as i (i)}
					<div class="rounded-xl border p-4 shadow-sm">
						<div class="flex items-start justify-between gap-4">
							<div class="flex flex-1 flex-col gap-2">
								<div class="flex items-center gap-2">
									<Skeleton class="h-4 w-24 rounded" />
									<Skeleton class="h-5 w-16 rounded-full" />
									<Skeleton class="h-5 w-14 rounded-full" />
								</div>
								<Skeleton class="h-3 w-40 rounded" />
								<Skeleton class="h-3 w-52 rounded" />
							</div>
							<div class="flex flex-col items-end gap-2">
								<Skeleton class="h-4 w-12 rounded" />
								<Skeleton class="h-3 w-20 rounded" />
								<Skeleton class="h-7 w-28 rounded-md" />
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else if data.windowGroups.length === 0 && data.freeFormOrders.length === 0}
			<!-- No orders at all -->
			<Card>
				<CardContent class="flex flex-col items-center py-12 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
						<Icon icon="mdi:clipboard-list-outline" class="h-7 w-7 text-muted-foreground/50" />
					</div>
					<h3 class="mt-4 text-base font-semibold text-foreground">
						No {data.statusFilter
							? (statusLabels[data.statusFilter] ?? data.statusFilter).toLowerCase() + ' '
							: ''}orders
					</h3>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						{data.statusFilter
							? `Orders with "${statusLabels[data.statusFilter] ?? data.statusFilter}" status will appear here.`
							: 'Orders will appear here when customers place them.'}
					</p>
				</CardContent>
			</Card>
		{:else}
			{@const hasWindowGroups = data.windowGroups.length > 0}
			{@const hasFreeForm = data.freeFormOrders.length > 0}

			<!-- Check if search yields no results across all orders -->
			{@const anySearchMatch =
				!searchQuery.trim() ||
				data.windowGroups.some((g) => g.orders.some(matchesSearch)) ||
				data.freeFormOrders.some(matchesSearch)}

			{#if !anySearchMatch}
				<Card>
					<CardContent class="flex flex-col items-center py-12 text-center">
						<h3 class="text-base font-semibold text-foreground">No results</h3>
						<p class="mt-1 text-sm text-muted-foreground">No orders match "{searchQuery}".</p>
						<Button
							variant="link"
							onclick={() => (searchQuery = '')}
							class="mt-3 h-auto p-0 text-xs">Clear search</Button
						>
					</CardContent>
				</Card>
			{:else}
				<div class="space-y-6">
					<!-- Window groups (soonest first) -->
					{#each data.windowGroups as group (group.window.windowId)}
						{@const visibleOrders = searchQuery.trim()
							? group.orders.filter(matchesSearch)
							: group.orders}
						{#if visibleOrders.length > 0}
							<div>
								<!-- Group header -->
								<div class="mb-2 flex items-baseline justify-between gap-2">
									<div>
										<h2 class="text-sm font-semibold text-gray-900">
											{fmtWindowDate(group.window.startsAt)} · {fmtWindowTime(
												group.window.startsAt
											)}–{fmtWindowTime(group.window.endsAt)}
											{#if group.window.locationName}
												<span class="font-normal text-gray-500">· {group.window.locationName}</span>
											{/if}
										</h2>
										<p class="mt-0.5 text-xs text-gray-500">
											{group.orders.length}
											{group.orders.length === 1 ? 'order' : 'orders'} · ${(
												group.totalRevenue / 100
											).toFixed(2)}
										</p>
									</div>
								</div>
								<!-- Order cards -->
								<div class="space-y-3">
									{#each visibleOrders as order (order.id)}
										{@render orderCard(order)}
									{/each}
								</div>
							</div>
						{/if}
					{/each}

					<!-- Free-form orders section -->
					{#if hasFreeForm}
						{@const visibleFreeForm = searchQuery.trim()
							? data.freeFormOrders.filter(matchesSearch)
							: data.freeFormOrders}
						{#if visibleFreeForm.length > 0}
							<div>
								{#if hasWindowGroups}
									<!-- Header only when window groups also exist -->
									<div class="mb-2">
										<h2 class="text-sm font-semibold text-gray-900">Free-form pickups</h2>
										<p class="mt-0.5 text-xs text-gray-500">
											{data.freeFormOrders.length}
											{data.freeFormOrders.length === 1 ? 'order' : 'orders'}
										</p>
									</div>
								{/if}
								<div class="space-y-3">
									{#each visibleFreeForm as order (order.id)}
										{@render orderCard(order)}
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</div>
			{/if}
		{/if}
	{/if}
</div>

{#snippet orderCard(order: {
	id: number;
	orderNumber: string;
	customerName: string | null;
	customerPhone: string | null;
	total: number;
	status: string;
	paymentStatus: string;
	type: string;
	pickupType: string | null;
	pickupMode: string | null;
	createdAt: Date;
	notes: string | null;
	scheduledFor: Date | null;
	stripePaymentIntentId: string | null;
	items: { name: string; quantity: number }[];
})}
	{@const isCancelled = order.status === 'cancelled'}
	{@const showCancel = !['fulfilled', 'cancelled'].includes(order.status)}
	{@const showRefund = order.status === 'cancelled' && order.paymentStatus === 'paid'}
	{@const hasActions = showCancel || showRefund}
	<Card class="shadow-sm transition-shadow hover:shadow-md {isCancelled ? 'opacity-50' : ''}">
		<!-- Card body: clickable, navigates to detail -->
		<CardContent
			role="button"
			tabindex={0}
			class="cursor-pointer"
			onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
			onkeydown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') goto(resolve(`/dashboard/orders/${order.id}`));
			}}
		>
			<div class="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
				<!-- Left: order info -->
				<div class="min-w-0 flex-1">
					<!-- Badges row -->
					<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
						<button
							type="button"
							onclick={(e) => copyOrderNumber(e, order.id, order.orderNumber)}
							class="cursor-copy font-mono text-xs text-gray-500 transition-colors hover:text-gray-700 hover:underline"
							title="Click to copy"
						>
							{copiedId === order.id ? 'Copied!' : order.orderNumber}
						</button>
						{#if order.status === 'cancelled'}
							<span class="inline-flex items-center gap-1.5">
								<Icon icon="mdi:close-circle" class="h-3.5 w-3.5 text-red-500" />
								<span class="text-xs text-gray-500">Cancelled</span>
							</span>
						{:else}
							<span class="inline-flex items-center gap-2">
								<span class="inline-block w-40 shrink-0">
									<OrderStatusStepper status={order.status} variant="mini" colorScheme="themed" />
								</span>
								<span class="text-xs text-gray-500">
									{statusLabels[order.status] ?? order.status}
								</span>
							</span>
						{/if}
						{#if order.paymentStatus === 'paid'}
							<StatusBadge variant="success">paid</StatusBadge>
						{:else if order.paymentStatus === 'refunded'}
							<StatusBadge tone="bg-orange-100 text-orange-700">refunded</StatusBadge>
						{:else if order.paymentStatus === 'failed'}
							<StatusBadge variant="danger">payment failed</StatusBadge>
						{/if}
						{#if order.pickupType === 'custom_date'}
							<StatusBadge tone="bg-slate-100 text-slate-700">Custom date</StatusBadge>
						{/if}
						{#if order.pickupMode === 'storefront_hours' && !order.scheduledFor}
							<Icon
								icon="mdi:lightning-bolt"
								class="h-3.5 w-3.5 text-amber-500"
								aria-label="ASAP pickup"
							/>
						{/if}
					</div>
					<!-- Customer -->
					{#if order.customerName}
						<p class="text-sm font-medium text-gray-900">{order.customerName}</p>
					{/if}
					<!-- Pickup context: custom-date request (date only) or storefront scheduled time -->
					{#if order.scheduledFor}
						<p class="mt-1 flex items-center gap-1 text-xs text-amber-700">
							<Icon icon="mdi:clock-outline" class="h-3.5 w-3.5 shrink-0" />
							{#if order.pickupType === 'custom_date'}
								Requested for {new Date(order.scheduledFor).toLocaleDateString([], {
									weekday: 'short',
									month: 'short',
									day: 'numeric'
								})}
							{:else}
								{new Date(order.scheduledFor).toLocaleString([], {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									hour: 'numeric',
									minute: '2-digit'
								})}
								{#if order.pickupMode === 'storefront_hours'}
									· in person at the store
								{/if}
							{/if}
							<span class="text-amber-500">
								· {formatDistanceToNow(new Date(order.scheduledFor), { addSuffix: true })}
							</span>
						</p>
					{/if}
					{#if order.items && order.items.length > 0}
						<p class="mt-1.5 line-clamp-2 text-xs text-gray-500">
							{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
						</p>
					{/if}
				</div>

				<!-- Right: price -->
				<div
					role="none"
					class="flex flex-col gap-2 md:shrink-0 md:items-end md:gap-1"
					onclick={(e) => e.stopPropagation()}
				>
					<span class="text-sm font-medium text-gray-900">
						${(order.total / 100).toFixed(2)}
					</span>
				</div>
			</div>
		</CardContent>

		<!-- Action strip: only renders when there are actions available -->
		{#if hasActions}
			<CardFooter class="justify-end gap-3">
				{#if showCancel}
					<form
						method="post"
						action="?/cancel"
						use:enhance={enhanceWithToasts({
							successMessage: 'Order cancelled',
							onStart: () => {
								submittingRowAction = { id: order.id, action: 'cancel' };
								rowActionError = null;
							},
							onEnd: () => {
								submittingRowAction = null;
							},
							onError: (msg) => {
								rowActionError = msg;
							}
						})}
						autocomplete="off"
						class="flex"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="ghost"
							class="text-red-500 hover:bg-red-50 hover:text-red-600"
							disabled={submittingRowAction !== null}
							onclick={async (e) => {
								e.preventDefault();
								const form = (e.currentTarget as HTMLButtonElement).form;
								if (await confirmDialog('Cancel this order?')) form?.requestSubmit();
							}}
						>
							{#if submittingRowAction?.id === order.id && submittingRowAction?.action === 'cancel'}
								<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
								Cancelling...
							{:else}
								Cancel
							{/if}
						</Button>
					</form>
				{/if}
				{#if showRefund}
					<form
						method="post"
						action="?/refund"
						use:enhance={enhanceWithToasts({
							successMessage: 'Refund issued',
							onStart: () => {
								submittingRowAction = { id: order.id, action: 'refund' };
								rowActionError = null;
							},
							onEnd: () => {
								submittingRowAction = null;
							},
							onError: (msg) => {
								rowActionError = msg;
							}
						})}
						autocomplete="off"
						class="flex"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="ghost"
							class="text-red-500 hover:bg-red-50 hover:text-red-600"
							disabled={submittingRowAction !== null}
							onclick={async (e) => {
								e.preventDefault();
								const form = (e.currentTarget as HTMLButtonElement).form;
								if (await confirmDialog('Issue a full refund for this order?'))
									form?.requestSubmit();
							}}
						>
							{#if submittingRowAction?.id === order.id && submittingRowAction?.action === 'refund'}
								<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
								Refunding...
							{:else}
								Refund
							{/if}
						</Button>
					</form>
				{/if}
			</CardFooter>
		{/if}
	</Card>
{/snippet}

<style>
	@media print {
		:global(body) {
			background: white !important;
		}
	}
</style>
