<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const statusColors: Record<string, string> = {
		fulfilled: 'bg-gray-100 text-gray-600',
		cancelled: 'bg-red-100 text-red-600'
	};

	function buildStatusUrl(status: string) {
		const p = new URLSearchParams();
		if (data.search) p.set('q', data.search);
		if (data.from) p.set('from', data.from);
		if (data.to) p.set('to', data.to);
		if (status) p.set('status', status);
		return `?${p.toString()}`;
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<div class="mb-1 flex items-center gap-1.5 text-sm text-gray-400">
				<a href={resolve('/dashboard/orders')} class="hover:text-gray-700">Orders</a>
				<Icon icon="mdi:chevron-right" class="h-3.5 w-3.5" />
				<span>History</span>
			</div>
			<h1 class="text-2xl font-bold text-gray-900">Order History</h1>
		</div>
		<span class="text-sm text-gray-500"
			>{data.orders.length} result{data.orders.length === 1 ? '' : 's'}</span
		>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Search -->
	<form method="GET" class="mb-5 space-y-3">
		<input type="hidden" name="status" value={data.statusFilter} />
		<div class="flex gap-2">
			<div class="relative flex-1">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<input
					type="search"
					name="q"
					value={data.search}
					placeholder="Search by order #, customer name, email, or phone…"
					class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
				/>
			</div>
			<button
				type="submit"
				class="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
			>
				Search
			</button>
		</div>
		<div class="flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2">
				<label for="date-from" class="whitespace-nowrap text-xs text-gray-500">From</label>
				<input
					id="date-from"
					type="date"
					name="from"
					value={data.from}
					class="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
				/>
			</div>
			<div class="flex items-center gap-2">
				<label for="date-to" class="text-xs text-gray-500">To</label>
				<input
					id="date-to"
					type="date"
					name="to"
					value={data.to}
					class="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
				/>
			</div>
		</div>
	</form>

	<!-- Status tabs -->
	<div class="mb-5 flex gap-1 overflow-x-auto">
		{#each [['', 'All History'], ['fulfilled', 'Fulfilled'], ['cancelled', 'Cancelled']] as [val, label] (val)}
			<a
				href={buildStatusUrl(val)}
				class="rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors
					{data.statusFilter === val
					? 'bg-green-600 text-white'
					: 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}"
			>
				{label}
			</a>
		{/each}
	</div>

	{#if data.orders.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-sm text-gray-400">
				No historical orders found{data.search ? ` matching "${data.search}"` : ''}.
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
								>{order.orderNumber}</a>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[order.status] ??
										'bg-gray-100 text-gray-600'}"
								>
									{order.status}
								</span>
								<span
									class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 capitalize"
								>{order.type}</span>
								{#if order.paymentStatus === 'paid'}
									<span class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
										>paid</span
									>
								{:else if order.paymentStatus === 'refunded'}
									<span class="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700"
										>refunded</span
									>
								{:else if order.paymentStatus === 'failed'}
									<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600"
										>payment failed</span
									>
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
									year: 'numeric',
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

					{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
						<div class="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
							<form method="post" action="?/refund" use:enhance>
								<input type="hidden" name="id" value={order.id} />
								<button
									type="submit"
									onclick={async (e) => {
										e.preventDefault();
										if (await confirmDialog('Issue a full refund for this order?'))
											(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
									}}
									class="rounded-md border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50"
								>
									Refund payment
								</button>
							</form>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
