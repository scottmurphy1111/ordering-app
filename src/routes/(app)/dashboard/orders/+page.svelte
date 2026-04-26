<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardHeader, CardAction, CardFooter } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
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

	const statuses = ['', 'received', 'confirmed', 'preparing', 'ready', 'fulfilled', 'cancelled'];
	const statusLabels: Record<string, string> = {
		'': 'All',
		received: 'Received',
		confirmed: 'Confirmed',
		preparing: 'Preparing',
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

	const totalActiveCount = $derived(
		Object.values(data.statusCounts).reduce((a, b) => a + b, 0)
	);

	function tabCount(s: string): number {
		return s === '' ? totalActiveCount : (data.statusCounts[s] ?? 0);
	}

	function itemSummary(items: { name: string; quantity: number }[]): string {
		if (!items.length) return '';
		const labels = items
			.slice(0, 2)
			.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name));
		const extra = items.length - 2;
		return extra > 0 ? `${labels.join(', ')}, +${extra} more` : labels.join(', ');
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-foreground">Orders</h1>
		<div class="flex items-center gap-1 rounded-xl border bg-background p-1 shadow-sm">
			<span class="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-medium bg-gray-900 text-white">
				<span class="relative flex h-1.5 w-1.5">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"></span>
					<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary"></span>
				</span>
				Live
			</span>
			<a
				href={resolve('/dashboard/orders/history')}
				class="flex items-center gap-1 rounded-lg px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<Icon icon="mdi:history" class="h-3.5 w-3.5" />
				History
			</a>
		</div>
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}

	<!-- Status filter tabs -->
	<div class="mb-5 flex gap-1 overflow-x-auto">
		{#each statuses as s (s)}
			<Button
				href={resolve(s ? `/dashboard/orders?status=${s}` : '/dashboard/orders')}
				variant={data.statusFilter === s ? 'default' : 'ghost'}
				size="sm"
			>{statusLabels[s]}{tabCount(s) > 0 ? ` (${tabCount(s)})` : ''}</Button
			>
		{/each}
	</div>

	{#if !mounted}
		<div class="space-y-3">
			{#each [0, 1, 2, 3] as i (i)}
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex flex-1 flex-col gap-2">
							<div class="flex items-center gap-2">
								<Skeleton class="h-4 w-24 rounded" />
								<Skeleton class="h-5 w-16 rounded-full" />
								<Skeleton class="h-5 w-14 rounded-full" />
							</div>
							<Skeleton class="h-3 w-40 rounded" />
							<Skeleton class="h-3 w-52 rounded" />
						</div>
						<div class="flex flex-col items-end gap-1">
							<Skeleton class="h-4 w-12 rounded" />
							<Skeleton class="h-3 w-20 rounded" />
						</div>
					</CardHeader>
				</Card>
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
					? `No orders with "${statusLabels[data.statusFilter]}" status yet.`
					: 'Orders will appear here when customers place them.'}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.orders as order (order.id)}
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<div class="flex flex-wrap items-center gap-2">
								<a
									href={resolve(`/dashboard/orders/${order.id}`)}
									class="font-mono text-sm font-semibold hover:underline">{order.orderNumber}</a
								>
								<Badge class={statusColors[order.status] ?? 'bg-muted text-muted-foreground'}>
									{order.status}
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
							{#if order.customerName}
								<p class="text-sm text-muted-foreground">
									{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
								</p>
							{/if}
							{#if order.items.length > 0}
								<p class="text-xs text-muted-foreground">{itemSummary(order.items)}</p>
							{/if}
							{#if order.scheduledFor}
								<p class="flex items-center gap-1 text-xs font-medium text-amber-600">
									<Icon icon="mdi:clock-outline" class="h-3.5 w-3.5 shrink-0" />
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
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0" />
									{order.deliveryAddress}
								</p>
							{/if}
							{#if order.notes}
								<p class="text-xs text-muted-foreground italic">"{order.notes}"</p>
							{/if}
						</div>
						<CardAction class="text-right">
							<p class="font-semibold">${(order.total / 100).toFixed(2)}</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{new Date(order.createdAt).toLocaleString([], {
									month: 'short',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
							<a
								href={resolve(`/dashboard/orders/${order.id}`)}
								class="mt-1 inline-flex items-center gap-0.5 text-xs text-primary hover:underline"
							>
								View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
							</a>
						</CardAction>
					</CardHeader>
					{#if nextStatus[order.status] || !['fulfilled', 'cancelled'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
						<CardFooter class="gap-2">
							{#if nextStatus[order.status]}
								<form method="post" action="?/updateStatus" use:enhance autocomplete="off">
									<input type="hidden" name="id" value={order.id} />
									<input type="hidden" name="status" value={nextStatus[order.status]} />
									<Button type="submit" variant="outline" size="sm">
										Mark as {nextStatus[order.status]}
									</Button>
								</form>
							{/if}
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
										class="text-xs text-red-500 transition-colors hover:text-red-600"
									>
										Cancel order
									</button>
								</form>
							{/if}
							{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
								<form method="post" action="?/refund" use:enhance autocomplete="off">
									<input type="hidden" name="id" value={order.id} />
									<Button
										type="submit"
										onclick={async (e) => {
											e.preventDefault();
											const btn = e.currentTarget as HTMLButtonElement;
											if (await confirmDialog('Issue a full refund for this order?'))
												btn.form?.requestSubmit();
										}}
										variant="outline"
										size="sm"
										class="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-600"
									>
										Refund payment
									</Button>
								</form>
							{/if}
						</CardFooter>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
