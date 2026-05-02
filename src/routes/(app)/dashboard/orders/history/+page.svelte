<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import OrdersViewToggle from '$lib/components/OrdersViewToggle.svelte';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import OrdersFilterTabs from '$lib/components/OrdersFilterTabs.svelte';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
		const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
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

	const statusBadge: Record<string, string> = {
		fulfilled: 'bg-muted text-muted-foreground',
		cancelled: 'bg-red-100 text-red-600'
	};
</script>

<div>
	<!-- Header -->
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold text-foreground">Orders</h1>
		<OrdersViewToggle />
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- Summary bar -->
	<OrdersSummaryBar compact stats={[
		{ label: 'Total orders', value: Number(data.summary.total) },
		{ label: 'Fulfilled', value: Number(data.summary.fulfilled) },
		{ label: 'Cancelled', value: Number(data.summary.cancelled), urgent: Number(data.summary.cancelled) > 0 },
		{ label: 'Revenue', value: `$${(Number(data.summary.revenue) / 100).toFixed(2)}`, positive: true },
		{ label: 'Refunded', value: Number(data.summary.refunded) }
	]} />

	<!-- Row 1: Search -->
	<form method="GET" class="mb-3">
		<input type="hidden" name="status" value={data.statusFilter} />
		<div class="relative w-full">
			<Icon icon="mdi:magnify" class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
			<input
				type="search"
				name="q"
				value={data.search}
				placeholder="Search by order #, customer name, email, or phone…"
				class="w-full rounded-lg border border-gray-200 bg-background h-10 pr-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-transparent focus:ring-2 focus:ring-primary/50"
				oninput={(e) => debounceSubmit(e.currentTarget.form!)}
			/>
		</div>
	</form>

	<!-- Row 2: Filter tabs LEFT, date range + export RIGHT -->
	<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
		<OrdersFilterTabs
			tabs={[
				{ label: 'All', value: '', count: Number(data.summary.total) },
				{ label: 'Fulfilled', value: 'fulfilled', count: Number(data.summary.fulfilled) },
				{ label: 'Cancelled', value: 'cancelled', count: Number(data.summary.cancelled) }
			]}
			active={data.statusFilter}
			onchange={(val) => goto(resolve(buildStatusPath(val)))}
		/>

		<div class="flex flex-col gap-2 md:flex-row md:items-center">
			<!-- Date range single container -->
			<form method="GET">
				<input type="hidden" name="status" value={data.statusFilter} />
				<input type="hidden" name="q" value={data.search} />
				<div class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-background px-3 py-1.5">
					<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
					<input
						id="date-from"
						type="date"
						name="from"
						value={data.from}
						class="w-32 border-none bg-transparent text-xs text-foreground outline-none focus:ring-0"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
					<span class="text-muted-foreground/40">→</span>
					<input
						id="date-to"
						type="date"
						name="to"
						value={data.to}
						class="w-32 border-none bg-transparent text-xs text-foreground outline-none focus:ring-0"
						onchange={(e) => e.currentTarget.form?.requestSubmit()}
					/>
					{#if data.from || data.to}
						<button
							type="button"
							class="ml-1 text-muted-foreground transition-colors hover:text-foreground"
							onclick={() => {
								const entries = { q: data.search, status: data.statusFilter };
								const p = new SvelteURLSearchParams(Object.fromEntries(Object.entries(entries).filter(([, v]) => v)));
								const qs = p.toString();
								goto(qs ? resolve(`/dashboard/orders/history?${qs}` as `/${string}`) : resolve('/dashboard/orders/history'), { replaceState: true });
							}}
						>
							<Icon icon="mdi:close" class="h-3 w-3" />
						</button>
					{/if}
				</div>
			</form>

			<!-- Results count + export -->
			<div class="flex items-center gap-2">
				<span class="text-xs text-muted-foreground">{data.orders.length} result{data.orders.length === 1 ? '' : 's'}</span>
				<button
					type="button"
					onclick={exportCSV}
					class="flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					<Icon icon="mdi:download" class="h-3.5 w-3.5" />
					Export CSV
				</button>
			</div>
		</div>
	</div>

	{#if data.orders.length === 0}
		<div class="rounded-xl border border-dashed p-12 text-center">
			<Icon icon="mdi:receipt-text-outline" class="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
			<p class="text-sm font-medium text-muted-foreground">
				{#if hasFilters}
					No orders match your current filters.
				{:else}
					No historical orders yet. Completed and cancelled orders older than 24 hours will appear here.
				{/if}
			</p>
			{#if hasFilters}
				<button
					type="button"
					onclick={clearFilters}
					class="mt-3 text-xs text-primary hover:underline"
				>
					Clear filters
				</button>
			{/if}
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.orders as order (order.id)}
				<div
					role="button"
					tabindex="0"
					class="group rounded-xl border bg-background shadow-sm transition-colors hover:bg-muted/40 cursor-pointer overflow-hidden"
					onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(resolve(`/dashboard/orders/${order.id}`)); } }}
				>
					<div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:gap-3">
						<!-- Main info -->
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2 mb-1">
								<span class="font-mono text-sm font-semibold">{order.orderNumber}</span>
								<Badge class="{statusBadge[order.status] ?? 'bg-muted text-muted-foreground'} capitalize">
									{order.status}
								</Badge>
								<Badge class="bg-muted text-muted-foreground capitalize">{order.type}</Badge>
								{#if order.paymentStatus && paymentBadge[order.paymentStatus]}
									<Badge class={paymentBadge[order.paymentStatus].cls}>
										{paymentBadge[order.paymentStatus].label}
									</Badge>
								{/if}
							</div>
							{#if order.customerName}
								<p class="text-sm text-muted-foreground">
									{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
								</p>
							{/if}
							{#if order.scheduledFor}
								<p class="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
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
								<p class="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
									<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0" />
									{order.deliveryAddress}
								</p>
							{/if}
							{#if order.items && order.items.length > 0}
								<p class="mt-1.5 text-xs text-muted-foreground">
									{order.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
								</p>
							{/if}
						</div>

						<!-- Right side: price + date + refund -->
						<div
							role="none"
							class="flex flex-col gap-2 md:shrink-0 md:items-end md:gap-2"
							onclick={(e) => e.stopPropagation()}
						>
							<div class="md:text-right">
								<p class="font-semibold">${(order.total / 100).toFixed(2)}</p>
								<p class="text-xs text-muted-foreground">
									{new Date(order.createdAt).toLocaleString([], {
										month: 'short',
										day: 'numeric',
										year: 'numeric',
										hour: '2-digit',
										minute: '2-digit'
									})}
								</p>
							</div>
							{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
								<form method="post" action="?/refund" use:enhance>
									<input type="hidden" name="id" value={order.id} />
									<button
										type="submit"
										onclick={async (e) => {
											e.preventDefault();
											const btn = e.currentTarget as HTMLButtonElement;
											if (await confirmDialog('Issue a full refund for this order?'))
												btn.form?.requestSubmit();
										}}
										class="rounded-md h-8 border border-red-200 px-2.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50"
									>
										Refund
									</button>
								</form>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
