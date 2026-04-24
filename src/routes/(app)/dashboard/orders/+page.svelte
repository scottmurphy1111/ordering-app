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

	let { data, form }: { data: PageData; form: ActionData } = $props();

	onMount(() => {
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
		ready: 'bg-green-100 text-green-700',
		fulfilled: 'bg-gray-100 text-gray-600',
		cancelled: 'bg-red-100 text-red-600'
	};
	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Orders</h1>
		<div class="flex items-center gap-2">
			<a
				href={resolve('/dashboard/orders/history')}
				class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
			>
				<Icon icon="mdi:history" class="h-4 w-4" />
				History
			</a>
			<span class="text-gray-200">|</span>
			<span class="flex items-center gap-1.5 text-xs text-gray-400">
				<span class="relative flex h-2 w-2">
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
					></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
				</span>
				Live
			</span>
			<span class="text-sm text-gray-500">{data.orders.length} shown</span>
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Status filter tabs -->
	<div class="mb-5 flex gap-1 overflow-x-auto">
		{#each statuses as s (s)}
			<a
				href={resolve(`/dashboard/orders${s ? `?status=${s}` : ''}`)}
				class="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors
					{data.statusFilter === s
					? 'bg-green-600 text-white'
					: 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}"
			>
				{statusLabels[s]}
			</a>
		{/each}
	</div>

	{#if data.orders.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-sm text-gray-400">
				No orders{data.statusFilter ? ` with status "${data.statusFilter}"` : ''} yet.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.orders as order (order.id)}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<a
									href={resolve(`/dashboard/orders/${order.id}`)}
									class="font-mono text-sm font-semibold text-gray-800 hover:underline"
									>{order.orderNumber}</a
								>
								<Badge class={statusColors[order.status] ?? 'bg-gray-100'}>
									{order.status}
								</Badge>
								<Badge class="bg-gray-100 text-gray-500 capitalize">{order.type}</Badge>
								{#if order.paymentStatus === 'paid'}
									<Badge class="bg-emerald-100 text-emerald-700">paid</Badge>
								{:else if order.paymentStatus === 'refunded'}
									<Badge class="bg-orange-100 text-orange-700">refunded</Badge>
								{:else if order.paymentStatus === 'failed'}
									<Badge class="bg-red-100 text-red-600">payment failed</Badge>
								{/if}
							</div>
							{#if order.customerName}
								<p class="mt-1 text-sm text-gray-600">
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
								<p class="mt-1 flex items-center gap-1 text-xs text-gray-500">
									<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0 text-gray-400" />
									{order.deliveryAddress}
								</p>
							{/if}
							{#if order.notes}
								<p class="mt-1 text-xs text-gray-400 italic">"{order.notes}"</p>
							{/if}
						</div>
						<div class="shrink-0 text-right">
							<p class="font-semibold text-gray-900">${(order.total / 100).toFixed(2)}</p>
							<p class="mt-0.5 text-xs text-gray-400">
								{new Date(order.createdAt).toLocaleString([], {
									month: 'short',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
							<a
								href={resolve(`/dashboard/orders/${order.id}`)}
								class="mt-1 inline-flex items-center gap-0.5 text-xs text-green-600 hover:underline"
							>
								View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
							</a>
						</div>
					</div>

					{#if nextStatus[order.status] || !['fulfilled', 'cancelled'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
						<div class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
							{#if nextStatus[order.status]}
								<form method="post" action="?/updateStatus" use:enhance>
									<input type="hidden" name="id" value={order.id} />
									<input type="hidden" name="status" value={nextStatus[order.status]} />
									<Button type="submit" variant="outline" size="sm">
										Mark as {nextStatus[order.status]}
									</Button>
								</form>
							{/if}
							{#if !['fulfilled', 'cancelled'].includes(order.status)}
								<form method="post" action="?/cancel" use:enhance>
									<input type="hidden" name="id" value={order.id} />
									<Button
										type="submit"
										onclick={async (e) => {
											e.preventDefault();
											if (await confirmDialog('Cancel this order?'))
												(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
										}}
										variant="destructive"
										size="sm"
									>
										Cancel order
									</Button>
								</form>
							{/if}
							{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
								<form method="post" action="?/refund" use:enhance>
									<input type="hidden" name="id" value={order.id} />
									<Button
										type="submit"
										onclick={async (e) => {
											e.preventDefault();
											if (await confirmDialog('Issue a full refund for this order?'))
												(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
										}}
										variant="outline"
										size="sm"
										class="border-orange-200 text-orange-600 hover:bg-orange-50"
									>
										Refund payment
									</Button>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
