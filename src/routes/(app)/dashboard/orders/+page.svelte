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
	import { Skeleton } from '$lib/components/ui/skeleton';
	import OrdersViewToggle from '$lib/components/OrdersViewToggle.svelte';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import OrdersFilterTabs from '$lib/components/OrdersFilterTabs.svelte';

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
			if (interval) { clearInterval(interval); interval = null; }
		}
		start();
		document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
		return () => {
			stop();
			document.removeEventListener('visibilitychange', start);
		};
	});

	$effect(() => {
		const count = data.orders.length;
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
		} catch { /* browser may block without user gesture */ }
	}

	function copyOrderNumber(e: Event, id: number, num: string) {
		e.stopPropagation();
		navigator.clipboard.writeText(num).then(() => {
			copiedId = id;
			setTimeout(() => { copiedId = null; }, 1500);
		});
	}

	const statuses = ['', 'received', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled'];
	const statusLabels: Record<string, string> = {
		'': 'All',
		received: 'Received',
		confirmed: 'Confirmed',
		preparing: 'In production',
		ready: 'Ready',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled'
	};
	const statusColors: Record<string, string> = {
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
		received:  { label: 'Mark as confirmed', cls: 'bg-blue-600 text-white hover:bg-blue-700' },
		confirmed: { label: 'Mark as in production', cls: 'bg-amber-500 text-white hover:bg-amber-600' },
		preparing: { label: 'Mark as ready',     cls: 'bg-violet-600 text-white hover:bg-violet-700' },
		ready:     { label: 'Mark as fulfilled', cls: 'bg-green-600 text-white hover:bg-green-700' }
	};

	const totalActiveCount = $derived(Object.values(data.statusCounts).reduce((a, b) => a + b, 0));
	const needsAction = $derived((data.statusCounts['received'] ?? 0) + (data.statusCounts['ready'] ?? 0));
	const inProgress = $derived((data.statusCounts['confirmed'] ?? 0) + (data.statusCounts['preparing'] ?? 0));

	let searchQuery = $state('');
	const filteredOrders = $derived(
		searchQuery.trim()
			? data.orders.filter(
					(o) =>
						o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
						(o.customerName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
						(o.customerPhone ?? '').toLowerCase().includes(searchQuery.toLowerCase())
				)
			: data.orders
	);

	function tabCount(s: string): number {
		return s === '' ? totalActiveCount : (data.statusCounts[s] ?? 0);
	}

	function itemSummary(items: { name: string; quantity: number }[]): string {
		if (!items.length) return '';
		const labels = items.slice(0, 2).map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name));
		const extra = items.length - 2;
		return extra > 0 ? `${labels.join(', ')}, +${extra} more` : labels.join(', ');
	}

	// Urgent attention tabs
	const urgentStatuses = new Set(['received', 'ready']);
</script>

<div>
	<!-- Header -->
	<div class="mb-5 flex items-center justify-between gap-3">
		<h1 class="text-2xl font-bold text-foreground">Orders</h1>
		<div class="flex items-center gap-2">
			<!-- Sound toggle -->
			<button
				onclick={toggleSound}
				class="rounded-lg border p-2 transition-colors hover:bg-muted"
				title={soundEnabled ? 'Mute new order alerts' : 'Enable new order alerts'}
			>
				<Icon
					icon={soundEnabled ? 'mdi:bell-outline' : 'mdi:bell-off-outline'}
					class="h-4 w-4 {soundEnabled ? 'text-primary' : 'text-muted-foreground'}"
				/>
			</button>
			<!-- Live / History toggle -->
			<OrdersViewToggle />
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- Summary bar -->
	{#if mounted}
		<OrdersSummaryBar stats={[
			{ label: 'Needs action', value: needsAction, urgent: needsAction > 0 },
			{ label: 'In progress', value: inProgress },
			{ label: 'Scheduled', value: data.scheduledCount },
			{ label: "Today's revenue", value: `$${(data.todayRevenue / 100).toFixed(2)}` }
		]} />
	{/if}

	<!-- Row 1: Search -->
	<div class="relative mb-3">
		<Icon icon="mdi:magnify" class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
		<input
			type="search"
			bind:value={searchQuery}
			placeholder="Search by order #, customer name, or phone…"
			class="w-full rounded-lg border border-gray-200 bg-background py-2.5 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary/50"
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
			onchange={(val) => goto(resolve(val ? `/dashboard/orders?status=${val}` : '/dashboard/orders'))}
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
	{:else if data.orders.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
				<Icon icon="mdi:clipboard-list-outline" class="h-8 w-8 text-muted-foreground/40" />
			</div>
			<h2 class="mt-4 text-base font-semibold text-foreground">
				No {data.statusFilter ? statusLabels[data.statusFilter].toLowerCase() + ' ' : ''}orders
			</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				{data.statusFilter
					? `Orders with "${statusLabels[data.statusFilter]}" status will appear here.`
					: 'Orders will appear here when customers place them.'}
			</p>
		</div>
	{:else if filteredOrders.length === 0}
		<div class="flex flex-col items-center py-16 text-center">
			<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
				<Icon icon="mdi:magnify" class="h-8 w-8 text-muted-foreground/40" />
			</div>
			<h2 class="mt-4 text-base font-semibold text-foreground">No results</h2>
			<p class="mt-1 text-sm text-muted-foreground">No orders match "{searchQuery}".</p>
			<button
				type="button"
				onclick={() => (searchQuery = '')}
				class="mt-3 text-xs text-primary hover:underline"
			>Clear search</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each filteredOrders as order (order.id)}
				{@const isScheduled = !!order.scheduledFor}
				{@const action = statusActionConfig[order.status]}
				<div
					role="button"
					tabindex="0"
					class="cursor-pointer rounded-xl border bg-background shadow-sm transition-shadow hover:shadow-md
						{isScheduled ? 'border-l-[3px] border-l-amber-400 bg-amber-50/30' : ''}"
					onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') goto(resolve(`/dashboard/orders/${order.id}`)); }}
				>
					<div class="flex items-start gap-4 p-4">
						<!-- Left: order info -->
						<div class="min-w-0 flex-1">
							<!-- Badges row -->
							<div class="mb-1.5 flex flex-wrap items-center gap-1.5">
								<button
									onclick={(e) => copyOrderNumber(e, order.id, order.orderNumber)}
									class="cursor-copy font-mono text-xs font-semibold text-foreground transition-colors hover:text-muted-foreground hover:underline"
									title="Click to copy"
								>
									{copiedId === order.id ? 'Copied!' : order.orderNumber}
								</button>
								<Badge class={statusColors[order.status] ?? 'bg-muted text-muted-foreground'}>
									{statusLabels[order.status] ?? order.status}
								</Badge>
								<Badge class="bg-muted text-muted-foreground capitalize">{order.type}</Badge>
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
								<p class="text-sm text-foreground">
									{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
								</p>
							{/if}
							<!-- Items -->
							{#if order.items.length > 0}
								<p class="text-xs text-muted-foreground">{itemSummary(order.items)}</p>
							{/if}
							<!-- Scheduled -->
							{#if order.scheduledFor}
								<p class="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
									<Icon icon="mdi:clock-outline" class="h-3.5 w-3.5 shrink-0" />
									{new Date(order.scheduledFor).toLocaleString([], {
										weekday: 'short', month: 'short', day: 'numeric',
										hour: 'numeric', minute: '2-digit'
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
							<!-- Notes -->
							{#if order.notes}
								<p class="mt-0.5 text-xs text-muted-foreground italic">"{order.notes}"</p>
							{/if}
						</div>

						<!-- Right: price, time, actions -->
						<div
							role="none"
							class="flex shrink-0 flex-col items-end gap-1"
							onclick={(e) => e.stopPropagation()}
						>
							<span class="text-base font-semibold text-foreground">
								${(order.total / 100).toFixed(2)}
							</span>
							<span class="text-xs text-muted-foreground">
								{new Date(order.createdAt).toLocaleString([], {
									month: 'short', day: 'numeric',
									hour: '2-digit', minute: '2-digit'
								})}
							</span>

							<!-- Action buttons -->
							<div class="mt-2 flex flex-col items-end gap-1.5">
								{#if action}
									<form method="post" action="?/updateStatus" use:enhance autocomplete="off">
										<input type="hidden" name="id" value={order.id} />
										<input type="hidden" name="status" value={nextStatus[order.status]} />
										<button
											type="submit"
											class="rounded-md px-2.5 py-1 text-xs font-semibold transition-colors {action.cls}"
										>
											{action.label}
										</button>
									</form>
								{/if}
								<div class="flex items-center gap-1.5">
									{#if !['fulfilled', 'cancelled'].includes(order.status)}
										<form method="post" action="?/cancel" use:enhance autocomplete="off">
											<input type="hidden" name="id" value={order.id} />
											<button
												type="submit"
												onclick={async (e) => {
													e.preventDefault();
													const btn = e.currentTarget as HTMLButtonElement;
													if (await confirmDialog('Cancel this order?')) btn.form?.requestSubmit();
												}}
												class="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
											>
												Cancel
											</button>
										</form>
									{/if}
									{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
										<form method="post" action="?/refund" use:enhance autocomplete="off">
											<input type="hidden" name="id" value={order.id} />
											<button
												type="submit"
												onclick={async (e) => {
													e.preventDefault();
													const btn = e.currentTarget as HTMLButtonElement;
													if (await confirmDialog('Issue a full refund for this order?')) btn.form?.requestSubmit();
												}}
												class="rounded-md border border-orange-200 px-2.5 py-1 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50"
											>
												Refund
											</button>
										</form>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
