<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { invalidate, goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import { formatDistanceToNow } from 'date-fns';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import OrdersTabs from '$lib/components/OrdersTabs.svelte';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import OrdersFilterTabs from '$lib/components/OrdersFilterTabs.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Alert } from '$lib/components/ui/alert';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let mounted = $state(false);
	let soundEnabled = $state(true);
	let prevOrderCount = $state(-1);
	let copiedId = $state<number | null>(null);

	onMount(() => {
		mounted = true;
		soundEnabled = localStorage.getItem('ol_sound') !== 'false';
		let interval: ReturnType<typeof setInterval> | null = null;
		function start() {
			if (!interval) interval = setInterval(() => invalidate('app:orders'), 15_000);
		}
		function stop() {
			if (interval) {
				clearInterval(interval);
				interval = null;
			}
		}
		start();
		document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
		return () => {
			stop();
			document.removeEventListener('visibilitychange', start);
		};
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
		preparing: 'In production',
		ready: 'Ready',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled'
	};
	const statusColors: Record<string, string> = {
		scheduled: 'bg-slate-100 text-slate-600',
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-primary/90',
		fulfilled: 'bg-muted text-muted-foreground',
		cancelled: 'bg-red-100 text-red-600'
	};
	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};
	const statusActionConfig: Record<string, { label: string; cls: string }> = {
		received: { label: 'Mark as confirmed', cls: 'bg-blue-600 text-white hover:bg-blue-700' },
		confirmed: { label: 'Mark as in production', cls: 'bg-blue-600 text-white hover:bg-blue-700' },
		preparing: { label: 'Mark as ready', cls: 'bg-blue-600 text-white hover:bg-blue-700' },
		ready: { label: 'Mark as fulfilled', cls: 'bg-blue-600 text-white hover:bg-blue-700' }
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

	const urgentStatuses = new Set(['received', 'ready']);

	// ── Vendor timezone ─────────────────────────────────────────────────────────
	const vendorTimezone = $derived(data.vendor?.timezone ?? 'America/New_York');

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
</script>

<div>
	<!-- Header -->
	<div class="mb-5 flex items-center justify-between gap-3">
		<h1 class="text-2xl font-bold text-foreground">Orders</h1>
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon"
				onclick={toggleSound}
				title={soundEnabled ? 'Mute new order alerts' : 'Enable new order alerts'}
			>
				<Icon
					icon={soundEnabled ? 'mdi:bell-outline' : 'mdi:bell-off-outline'}
					class="h-4 w-4 {soundEnabled ? 'text-primary' : 'text-muted-foreground'}"
				/>
			</Button>
			<OrdersTabs />
		</div>
	</div>

	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}

	<!-- Orders / Production view toggle -->
	<div class="mb-4 flex items-center justify-between gap-3">
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
			<TabsList>
				<TabsTrigger value="orders">
					<Icon icon="mdi:format-list-bulleted" class="h-3.5 w-3.5" />
					Orders
				</TabsTrigger>
				<TabsTrigger value="production">
					<Icon icon="mdi:clipboard-list-outline" class="h-3.5 w-3.5" />
					Production
				</TabsTrigger>
			</TabsList>
		</Tabs>
		{#if data.view !== 'production'}
			<a
				href={resolve(cancelledToggleUrl as `/${string}`)}
				class="text-xs text-muted-foreground underline-offset-2 hover:underline"
			>
				{data.view === 'orders' && data.showCancelled ? 'Hide cancelled' : 'Show cancelled'}
			</a>
		{/if}
	</div>

	<!-- Summary bar -->
	{#if mounted}
		<OrdersSummaryBar
			compact
			stats={[
				{ label: 'Needs action', value: needsAction, urgent: needsAction > 0 },
				{ label: 'In progress', value: inProgress },
				{ label: 'Scheduled', value: data.scheduledCount },
				{ label: "Today's revenue", value: `$${(data.todayRevenue / 100).toFixed(2)}` }
			]}
		/>
	{/if}

	{#if data.view === 'production'}
		<!-- ── Production view ──────────────────────────────────────────────── -->
		{#if data.productionGroups.length === 0}
			<div class="flex flex-col items-center py-16 text-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
					<Icon icon="mdi:clipboard-list-outline" class="h-8 w-8 text-muted-foreground/40" />
				</div>
				<h2 class="mt-4 text-base font-semibold text-foreground">Nothing to prep yet</h2>
				<p class="mt-1 max-w-xs text-sm text-muted-foreground">
					Once customers place orders for upcoming pickup windows, you'll see what to prep here.
				</p>
			</div>
		{:else}
			<div class="space-y-6">
				{#each data.productionGroups as group (group.window.windowId)}
					<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
						<!-- Window group header -->
						<div class="border-b border-gray-100 bg-gray-50 px-4 py-3">
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
						<!-- Item aggregation table -->
						<table class="w-full">
							<tbody class="divide-y divide-gray-50">
								{#each group.items as item (item.name)}
									<tr class="px-4">
										<td class="px-4 py-3 text-sm text-gray-900">{item.name}</td>
										<td class="px-4 py-3 text-right">
											<span class="font-mono text-sm font-semibold text-gray-900">
												{item.totalQuantity}
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>
		{/if}
	{:else}
		<!-- ── Orders view ───────────────────────────────────────────────────── -->

		<!-- Row 1: Search -->
		<div class="relative mb-3">
			<Icon
				icon="mdi:magnify"
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				bind:value={searchQuery}
				placeholder="Search by order #, customer name, or phone…"
				class="pr-4 pl-9"
			/>
		</div>

		<!-- Row 2: Filter tabs -->
		<div class="mb-5">
			<OrdersFilterTabs
				tabs={statuses.map((s) => ({
					label: statusLabels[s],
					value: s,
					count: tabCount(s),
					dot: urgentStatuses.has(s)
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
			<div class="flex flex-col items-center py-16 text-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
					<Icon icon="mdi:clipboard-list-outline" class="h-8 w-8 text-muted-foreground/40" />
				</div>
				<h2 class="mt-4 text-base font-semibold text-foreground">
					No {data.statusFilter
						? (statusLabels[data.statusFilter] ?? data.statusFilter).toLowerCase() + ' '
						: ''}orders
				</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					{data.statusFilter
						? `Orders with "${statusLabels[data.statusFilter] ?? data.statusFilter}" status will appear here.`
						: 'Orders will appear here when customers place them.'}
				</p>
			</div>
		{:else}
			{@const hasWindowGroups = data.windowGroups.length > 0}
			{@const hasFreeForm = data.freeFormOrders.length > 0}

			<!-- Check if search yields no results across all orders -->
			{@const anySearchMatch =
				!searchQuery.trim() ||
				data.windowGroups.some((g) => g.orders.some(matchesSearch)) ||
				data.freeFormOrders.some(matchesSearch)}

			{#if !anySearchMatch}
				<div class="flex flex-col items-center py-16 text-center">
					<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
						<Icon icon="mdi:magnify" class="h-8 w-8 text-muted-foreground/40" />
					</div>
					<h2 class="mt-4 text-base font-semibold text-foreground">No results</h2>
					<p class="mt-1 text-sm text-muted-foreground">No orders match "{searchQuery}".</p>
					<Button variant="link" onclick={() => (searchQuery = '')} class="mt-3 h-auto p-0 text-xs"
						>Clear search</Button
					>
				</div>
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
	createdAt: Date;
	notes: string | null;
	scheduledFor: Date | null;
	deliveryAddress: string | null;
	stripePaymentIntentId: string | null;
	items: { name: string; quantity: number }[];
})}
	{@const isCancelled = order.status === 'cancelled'}
	{@const action = statusActionConfig[order.status]}
	<div
		role="button"
		tabindex="0"
		class="cursor-pointer rounded-xl border bg-background shadow-sm transition-shadow hover:shadow-md
			{isCancelled ? 'opacity-50' : ''}"
		onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') goto(resolve(`/dashboard/orders/${order.id}`));
		}}
	>
		<div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:gap-4">
			<!-- Left: order info -->
			<div class="min-w-0 flex-1">
				<!-- Badges row -->
				<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
					<button
						type="button"
						onclick={(e) => copyOrderNumber(e, order.id, order.orderNumber)}
						class="cursor-copy font-mono text-xs font-medium text-foreground transition-colors hover:text-muted-foreground hover:underline"
						title="Click to copy"
					>
						{copiedId === order.id ? 'Copied!' : order.orderNumber}
					</button>
					<Badge class={statusColors[order.status] ?? 'bg-muted text-muted-foreground'}>
						{statusLabels[order.status] ?? order.status}
					</Badge>
					{#if order.paymentStatus === 'paid'}
						<Badge class="bg-emerald-100 text-emerald-700">paid</Badge>
					{:else if order.paymentStatus === 'refunded'}
						<Badge class="bg-orange-100 text-orange-700">refunded</Badge>
					{:else if order.paymentStatus === 'failed'}
						<Badge class="bg-red-100 text-red-600">payment failed</Badge>
					{/if}
				</div>
				<!-- Customer -->
				{#if order.customerName}
					<p class="text-sm text-foreground">{order.customerName}</p>
				{/if}
				<!-- Scheduled (free-form) -->
				{#if order.scheduledFor}
					<p class="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
						<Icon icon="mdi:clock-outline" class="h-3.5 w-3.5 shrink-0" />
						{new Date(order.scheduledFor).toLocaleString([], {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: '2-digit'
						})}
						<span class="text-amber-400">
							· {formatDistanceToNow(new Date(order.scheduledFor), { addSuffix: true })}
						</span>
					</p>
				{/if}
				<!-- Delivery address -->
				{#if order.deliveryAddress}
					<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
						<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0" />
						{order.deliveryAddress}
					</p>
				{/if}
			</div>

			<!-- Right: price, time, actions -->
			<div
				role="none"
				class="flex flex-col gap-2 md:shrink-0 md:items-end md:gap-1"
				onclick={(e) => e.stopPropagation()}
			>
				<span class="text-base font-semibold text-foreground">
					${(order.total / 100).toFixed(2)}
				</span>

				<!-- Action buttons -->
				<div class="flex flex-row flex-wrap items-center gap-1.5 md:mt-2 md:justify-end">
					{#if action}
						<form method="post" action="?/updateStatus" use:enhance autocomplete="off">
							<input type="hidden" name="id" value={order.id} />
							<input type="hidden" name="status" value={nextStatus[order.status]} />
							<Button type="submit">
								{action.label}
							</Button>
						</form>
					{/if}
					{#if !['fulfilled', 'cancelled'].includes(order.status)}
						<form method="post" action="?/cancel" use:enhance autocomplete="off">
							<input type="hidden" name="id" value={order.id} />
							<Button
								type="submit"
								variant="destructive"
								onclick={async (e) => {
									e.preventDefault();
									const btn = e.currentTarget as HTMLButtonElement;
									if (await confirmDialog('Cancel this order?')) btn.form?.requestSubmit();
								}}
							>
								Cancel
							</Button>
						</form>
					{/if}
					{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
						<form method="post" action="?/refund" use:enhance autocomplete="off">
							<input type="hidden" name="id" value={order.id} />
							<Button
								type="submit"
								variant="destructive"
								onclick={async (e) => {
									e.preventDefault();
									const btn = e.currentTarget as HTMLButtonElement;
									if (await confirmDialog('Issue a full refund for this order?'))
										btn.form?.requestSubmit();
								}}
							>
								Refund
							</Button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/snippet}
