<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import { parseDate, type CalendarDate } from '@internationalized/date';
	import OrdersTabs from '$lib/components/OrdersTabs.svelte';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import OrdersFilterTabs from '$lib/components/OrdersFilterTabs.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { Alert } from '$lib/components/ui/alert';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let fromOpen = $state(false);
	let toOpen = $state(false);

	const fromDate = $derived(data.from ? parseDate(data.from) : undefined);
	const toDate = $derived(data.to ? parseDate(data.to) : undefined);

	function formatPickerDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function updateDateRange(which: 'from' | 'to', date: CalendarDate | undefined) {
		const p = new SvelteURLSearchParams();
		if (data.search) p.set('q', data.search);
		if (data.statusFilter) p.set('status', data.statusFilter);
		const nextFrom = which === 'from' ? date?.toString() : data.from;
		const nextTo = which === 'to' ? date?.toString() : data.to;
		if (nextFrom) p.set('from', nextFrom);
		if (nextTo) p.set('to', nextTo);
		const qs = p.toString();
		goto(
			qs
				? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
				: resolve('/dashboard/orders/history'),
			{ replaceState: true }
		);
	}

	function clearDates() {
		const p = new SvelteURLSearchParams();
		if (data.search) p.set('q', data.search);
		if (data.statusFilter) p.set('status', data.statusFilter);
		const qs = p.toString();
		goto(
			qs
				? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
				: resolve('/dashboard/orders/history'),
			{ replaceState: true }
		);
	}

	let debounceTimer: ReturnType<typeof setTimeout>;
	function debounceSubmit(f: HTMLFormElement) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const params = new SvelteURLSearchParams(
				new FormData(f) as unknown as Record<string, string>
			);
			for (const [key, val] of [...params.entries()]) {
				if (!val) params.delete(key);
			}
			const qs = params.toString();
			goto(
				qs
					? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
					: resolve('/dashboard/orders/history'),
				{ keepFocus: true, noScroll: true, replaceState: true }
			);
		}, 400);
	}

	const hasFilters = $derived(!!(data.search || data.from || data.to || data.statusFilter));

	function clearFilters() {
		goto(resolve('/dashboard/orders/history'), { replaceState: true });
	}

	function buildStatusPath(status: string): `/${string}` {
		const entries = { q: data.search, from: data.from, to: data.to, status };
		const p = new SvelteURLSearchParams(
			Object.fromEntries(Object.entries(entries).filter(([, v]) => v))
		);
		const qs = p.toString();
		return `/dashboard/orders/history${qs ? `?${qs}` : ''}`;
	}

	function exportCSV() {
		const rows = [
			['Order #', 'Customer', 'Email', 'Phone', 'Type', 'Status', 'Payment', 'Total', 'Date'],
			...data.orders.map((o) => [
				o.orderNumber,
				o.customerName ?? '',
				o.customerEmail ?? '',
				o.customerPhone ?? '',
				o.type,
				o.status,
				o.paymentStatus ?? '',
				(o.total / 100).toFixed(2),
				new Date(o.createdAt).toISOString()
			])
		];
		const csv = rows
			.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
			.join('\n');
		const blob = new Blob([csv], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `orders-history-${new Date().toISOString().slice(0, 10)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	const paymentBadge: Record<string, { cls: string; label: string }> = {
		paid: { cls: 'bg-emerald-100 text-emerald-700', label: 'Paid' },
		refunded: { cls: 'bg-orange-100 text-orange-700', label: 'Refunded' },
		failed: { cls: 'bg-red-100 text-red-600', label: 'Failed' },
		unpaid: { cls: 'bg-gray-100 text-gray-500', label: 'Unpaid' }
	};
</script>

<div>
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-foreground">Orders</h1>
		<OrdersTabs />
	</div>

	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}

	<!-- Summary bar -->
	<OrdersSummaryBar
		compact
		stats={[
			{ label: 'Total orders', value: Number(data.summary.total) },
			{ label: 'Fulfilled', value: Number(data.summary.fulfilled) },
			{
				label: 'Cancelled',
				value: Number(data.summary.cancelled),
				urgent: Number(data.summary.cancelled) > 0
			},
			{
				label: 'Revenue',
				value: `$${(Number(data.summary.revenue) / 100).toFixed(2)}`,
				positive: true
			},
			{ label: 'Refunded', value: Number(data.summary.refunded) }
		]}
	/>

	<!-- Row 1: Search -->
	<form method="GET" class="mb-3">
		<input type="hidden" name="status" value={data.statusFilter} />
		<div class="relative w-full">
			<Icon
				icon="mdi:magnify"
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				name="q"
				value={data.search}
				placeholder="Search by order #, customer name, email, or phone…"
				class="pr-4 pl-9"
				oninput={(e) => debounceSubmit((e.target as HTMLInputElement).closest('form')!)}
			/>
		</div>
	</form>

	<!-- Row 2: Filter tabs LEFT, date range + export RIGHT -->
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<OrdersFilterTabs
			tabs={[
				{ label: 'All', value: '', count: Number(data.summary.total) },
				{
					label: 'Fulfilled',
					value: 'fulfilled',
					count: Number(data.summary.fulfilled),
					icon: 'mdi:flag-checkered'
				},
				{
					label: 'Cancelled',
					value: 'cancelled',
					count: Number(data.summary.cancelled),
					icon: 'mdi:close-circle'
				}
			]}
			active={data.statusFilter}
			onchange={(val) => goto(resolve(buildStatusPath(val)))}
		/>

		<div class="flex flex-col gap-2 md:flex-row md:items-center">
			<!-- Date range single container -->
			<div
				class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-background px-3 py-1.5"
			>
				<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
				<Popover.Root bind:open={fromOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="text-xs outline-none {data.from
									? 'text-foreground'
									: 'text-muted-foreground'}"
							>
								{data.from ? formatPickerDate(data.from) : 'From'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={fromDate}
							onValueChange={(date) => {
								fromOpen = false;
								updateDateRange('from', date as CalendarDate | undefined);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<span class="text-muted-foreground/40">→</span>
				<Popover.Root bind:open={toOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="text-xs outline-none {data.to ? 'text-foreground' : 'text-muted-foreground'}"
							>
								{data.to ? formatPickerDate(data.to) : 'To'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={toDate}
							onValueChange={(date) => {
								toOpen = false;
								updateDateRange('to', date as CalendarDate | undefined);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				{#if data.from || data.to}
					<button
						type="button"
						class="ml-1 text-muted-foreground transition-colors hover:text-foreground"
						onclick={clearDates}
					>
						<Icon icon="mdi:close" class="h-3 w-3" />
					</button>
				{/if}
			</div>

			<!-- Results count + export -->
			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-foreground"
					>{data.orders.length} result{data.orders.length === 1 ? '' : 's'}</span
				>
				<Button variant="outline" onclick={exportCSV} class="gap-1">
					<Icon icon="mdi:download" class="h-3.5 w-3.5" />
					Export CSV
				</Button>
			</div>
		</div>
	</div>

	{#if data.orders.length === 0}
		<div class="rounded-xl border border-dashed p-12 text-center">
			<Icon
				icon="mdi:receipt-text-outline"
				class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40"
			/>
			<p class="text-sm font-medium text-muted-foreground">
				{#if hasFilters}
					No orders match your current filters.
				{:else}
					No historical orders yet. Completed and cancelled orders older than 24 hours will appear
					here.
				{/if}
			</p>
			{#if hasFilters}
				<Button variant="link" onclick={clearFilters} class="mt-3 h-auto p-0 text-xs">
					Clear filters
				</Button>
			{/if}
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.orders as order (order.id)}
				{@const showRefund = order.status === 'cancelled' && order.paymentStatus === 'paid'}
				<div
					class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
				>
					<!-- Card body: clickable, navigates to detail -->
					<div
						role="button"
						tabindex="0"
						class="cursor-pointer px-4 py-3"
						onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								goto(resolve(`/dashboard/orders/${order.id}`));
							}
						}}
					>
						<div class="flex flex-col gap-3 md:flex-row md:items-start md:gap-3">
							<!-- Main info -->
							<div class="min-w-0 flex-1">
								<div class="mb-1 flex flex-wrap items-center gap-2">
									<span class="font-mono text-xs text-gray-500">{order.orderNumber}</span>
									{#if order.status === 'cancelled'}
										<span class="inline-flex items-center gap-1.5">
											<Icon icon="mdi:close-circle" class="h-3.5 w-3.5 text-red-500" />
											<span class="text-xs text-gray-500">Cancelled</span>
										</span>
									{:else if order.status === 'fulfilled'}
										<span class="inline-flex items-center gap-1.5">
											<Icon icon="mdi:flag-checkered" class="h-3.5 w-3.5 text-primary" />
											<span class="text-xs text-gray-500">Fulfilled</span>
										</span>
									{:else}
										<span class="text-xs text-gray-500">
											{order.status}
										</span>
									{/if}
									<Badge class="bg-gray-100 text-gray-500 capitalize">{order.type}</Badge>
									{#if order.paymentStatus && paymentBadge[order.paymentStatus]}
										<Badge class={paymentBadge[order.paymentStatus].cls}>
											{paymentBadge[order.paymentStatus].label}
										</Badge>
									{/if}
								</div>
								{#if order.customerName}
									<p class="text-sm font-medium text-gray-900">
										{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
									</p>
								{/if}
								{#if order.scheduledFor}
									<p class="mt-1 flex items-center gap-1 text-xs text-amber-700">
										<Icon icon="mdi:calendar-clock" class="h-3.5 w-3.5 shrink-0" />
										Scheduled: {new Date(order.scheduledFor).toLocaleString([], {
											weekday: 'short',
											month: 'short',
											day: 'numeric',
											hour: 'numeric',
											minute: '2-digit'
										})}
									</p>
								{/if}
								{#if order.deliveryAddress}
									<p class="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
										<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0" />
										{order.deliveryAddress}
									</p>
								{/if}
								{#if order.items && order.items.length > 0}
									<p class="mt-1.5 line-clamp-2 text-xs text-gray-500">
										{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
									</p>
								{/if}
							</div>

							<!-- Right: price + date -->
							<div
								role="none"
								class="flex flex-col gap-1 md:shrink-0 md:items-end"
								onclick={(e) => e.stopPropagation()}
							>
								<p class="text-sm font-medium text-gray-900">${(order.total / 100).toFixed(2)}</p>
								<p class="text-xs text-gray-400">
									{new Date(order.createdAt).toLocaleString([], {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</div>
						</div>
					</div>

					<!-- Action strip: only for cancelled+paid orders -->
					{#if showRefund}
						<div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-2">
							<form method="post" action="?/refund" use:enhance class="flex">
								<input type="hidden" name="id" value={order.id} />
								<button
									type="submit"
									class="text-sm font-medium text-red-500 transition-colors hover:text-red-600"
									onclick={async (e) => {
										e.preventDefault();
										const btn = e.currentTarget as HTMLButtonElement;
										if (await confirmDialog('Issue a full refund for this order?'))
											btn.form?.requestSubmit();
									}}
								>
									Refund
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
