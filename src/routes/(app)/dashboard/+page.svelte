<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	onMount(() => {
		let interval: ReturnType<typeof setInterval> | null = null;
		function start() {
			if (!interval) interval = setInterval(() => invalidate('app:overview'), 15_000);
		}
		function stop() {
			if (interval) { clearInterval(interval); interval = null; }
		}
		start();
		document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
		return () => { stop(); document.removeEventListener('visibilitychange', start); };
	});

	const statusColors: Record<string, string> = {
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-green-700',
		fulfilled: 'bg-gray-100 text-gray-600',
		cancelled: 'bg-red-100 text-red-600'
	};
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Overview</h1>
		{#if data.tenant?.slug}
			<a
				data-tour="view-menu"
				href={resolve(`/${data.tenant.slug}/menu`)}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-700 transition-colors hover:bg-green-100"
			>
				View menu <Icon icon="mdi:open-in-new" class="h-3.5 w-3.5" />
			</a>
		{/if}
	</div>

	<!-- Stats grid -->
	<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Menu Items</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.items}</p>
			<a href={resolve('/dashboard/menu/items')} class="mt-2 block text-xs text-green-600 hover:underline"
				><span class="inline-flex items-center gap-1">Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" /></span></a
			>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Categories</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.categories}</p>
			<a href={resolve('/dashboard/menu/categories')} class="mt-2 block text-xs text-green-600 hover:underline"
				><span class="inline-flex items-center gap-1">Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" /></span></a
			>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Total Orders</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.orders}</p>
			{#if data.stats.pendingOrders > 0}
				<p class="mt-1 text-xs text-yellow-600">{data.stats.pendingOrders} pending</p>
			{/if}
			<a href={resolve('/dashboard/orders')} class="mt-2 inline-flex items-center gap-0.5 text-xs text-green-600 hover:underline">View <Icon icon="mdi:chevron-right" class="h-3 w-3" /></a>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Revenue</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">${(data.stats.revenue / 100).toFixed(2)}</p>
		</div>
	</div>

	<!-- Quick actions -->
	<div class="mb-8 flex flex-wrap gap-3">
		<a
			href={resolve('/dashboard/menu/items/new')}
			class="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
		>
			<Icon icon="mdi:plus" class="h-4 w-4" /> Add menu item
		</a>
		<a
			href={resolve('/dashboard/menu/categories')}
			class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
		>
			Manage categories
		</a>
		<a
			href={resolve('/dashboard/orders')}
			class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
		>
			View orders
		</a>
	</div>

	<!-- Recent orders -->
	{#if data.recentOrders.length > 0}
		<div>
			<div class="mb-3 flex items-center gap-2">
			<h2 class="text-base font-semibold text-gray-800">Recent orders</h2>
			<span class="flex items-center gap-1.5 text-xs text-gray-400">
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
				</span>
				Live
			</span>
		</div>
			<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
				<table class="w-full text-sm">
					<thead class="border-b border-gray-200 bg-gray-50">
						<tr>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Order</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Customer</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Type</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
							<th class="px-4 py-2.5 text-right font-medium text-gray-500">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.recentOrders as order (order.id)}
							<tr class="transition-colors hover:bg-gray-50">
								<td class="px-4 py-3 font-mono text-xs text-gray-600">
									<a href={resolve(`/dashboard/orders/${order.id}`)} class="hover:underline"
										>{order.orderNumber}</a
									>
								</td>
								<td class="px-4 py-3 text-gray-700">{order.customerName ?? '—'}</td>
								<td class="px-4 py-3 text-gray-500 capitalize">{order.type}</td>
								<td class="px-4 py-3">
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[
											order.status
										] ?? 'bg-gray-100 text-gray-600'}"
									>
										{order.status}
									</span>
								</td>
								<td class="px-4 py-3 text-right font-medium text-gray-900"
									>${(order.total / 100).toFixed(2)}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-dashed border-gray-300 p-10 text-center">
			<p class="text-sm text-gray-400">No orders yet. Share your menu to start receiving orders.</p>
		</div>
	{/if}
</div>
