<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	onMount(() => {
		let interval: ReturnType<typeof setInterval> | null = null;

		function start() {
			if (!interval) interval = setInterval(() => invalidate('app:orders'), 15_000);
		}
		function stop() {
			if (interval) { clearInterval(interval); interval = null; }
		}

		start();
		document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
		return () => { stop(); document.removeEventListener('visibilitychange', start); };
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
	<div class="flex items-center justify-between mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Orders</h1>
		<div class="flex items-center gap-2">
			<span class="flex items-center gap-1.5 text-xs text-gray-400">
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
				</span>
				Live
			</span>
			<span class="text-sm text-gray-500">{data.orders.length} shown</span>
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}

	<!-- Status filter tabs -->
	<div class="mb-5 flex gap-1 overflow-x-auto">
		{#each statuses as s (s)}
			<a
				href={resolve(`/dashboard/orders${s ? `?status=${s}` : ''}`)}
				class="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors
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
			<p class="text-gray-400 text-sm">No orders{data.statusFilter ? ` with status "${data.statusFilter}"` : ''} yet.</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.orders as order (order.id)}
				<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
					<div class="flex items-start justify-between gap-4">
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2 flex-wrap">
								<span class="font-mono text-sm font-semibold text-gray-800">{order.orderNumber}</span>
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[order.status] ?? 'bg-gray-100'}">
									{order.status}
								</span>
								<span class="rounded-full px-2 py-0.5 text-xs bg-gray-100 text-gray-500 capitalize">{order.type}</span>
								{#if order.paymentStatus === 'paid'}
									<span class="rounded-full px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700">paid</span>
								{:else if order.paymentStatus === 'refunded'}
									<span class="rounded-full px-2 py-0.5 text-xs bg-orange-100 text-orange-700">refunded</span>
								{:else if order.paymentStatus === 'failed'}
									<span class="rounded-full px-2 py-0.5 text-xs bg-red-100 text-red-600">payment failed</span>
								{/if}
							</div>
							{#if order.customerName}
								<p class="mt-1 text-sm text-gray-600">{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}</p>
							{/if}
							{#if order.scheduledFor}
								<p class="mt-1 flex items-center gap-1 text-xs text-amber-600 font-medium">
									<Icon icon="mdi:calendar-clock" class="h-3.5 w-3.5 shrink-0" />
									Scheduled: {new Date(order.scheduledFor).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
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
						<div class="text-right shrink-0">
							<p class="font-semibold text-gray-900">${(order.total / 100).toFixed(2)}</p>
							<p class="text-xs text-gray-400 mt-0.5">
								{new Date(order.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
							</p>
						</div>
					</div>

					{#if nextStatus[order.status] || !['fulfilled', 'cancelled'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
						<div class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
							{#if nextStatus[order.status]}
								<form method="post" action="?/updateStatus" use:enhance>
									<input type="hidden" name="id" value={order.id} />
									<input type="hidden" name="status" value={nextStatus[order.status]} />
									<button
										type="submit"
										class="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
									>
										Mark as {nextStatus[order.status]}
									</button>
								</form>
							{/if}
							{#if !['fulfilled', 'cancelled'].includes(order.status)}
								<form
									method="post"
									action="?/cancel"
									use:enhance
									onsubmit={(e) => { if (!confirm('Cancel this order?')) e.preventDefault(); }}
								>
									<input type="hidden" name="id" value={order.id} />
									<button
										type="submit"
										class="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
									>
										Cancel order
									</button>
								</form>
							{/if}
							{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
								<form
									method="post"
									action="?/refund"
									use:enhance
									onsubmit={(e) => { if (!confirm('Issue a full refund for this order?')) e.preventDefault(); }}
								>
									<input type="hidden" name="id" value={order.id} />
									<button
										type="submit"
										class="rounded-md border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50"
									>
										Refund payment
									</button>
								</form>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
