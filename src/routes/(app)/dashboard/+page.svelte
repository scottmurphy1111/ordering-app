<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();

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
	<h1 class="text-2xl font-bold text-gray-900 mb-6">Overview</h1>

	<!-- Stats grid -->
	<div class="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Menu Items</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.items}</p>
			<a href="/dashboard/menu/items" class="mt-2 block text-xs text-blue-600 hover:underline">Manage →</a>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Categories</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.categories}</p>
			<a href="/dashboard/menu/categories" class="mt-2 block text-xs text-blue-600 hover:underline">Manage →</a>
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Orders</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.orders}</p>
			{#if data.stats.pendingOrders > 0}
				<p class="mt-1 text-xs text-yellow-600">{data.stats.pendingOrders} pending</p>
			{/if}
		</div>
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
			<p class="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
			<p class="mt-1 text-3xl font-bold text-gray-900">${(data.stats.revenue / 100).toFixed(2)}</p>
		</div>
	</div>

	<!-- Quick actions -->
	<div class="mb-8 flex gap-3 flex-wrap">
		<a
			href="/dashboard/menu/items/new"
			class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
		>
			+ Add menu item
		</a>
		<a
			href="/dashboard/menu/categories"
			class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
		>
			Manage categories
		</a>
		<a
			href="/dashboard/orders"
			class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
		>
			View orders
		</a>
	</div>

	<!-- Recent orders -->
	{#if data.recentOrders.length > 0}
		<div>
			<h2 class="text-base font-semibold text-gray-800 mb-3">Recent orders</h2>
			<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-gray-50 border-b border-gray-200">
						<tr>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Order</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Customer</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Type</th>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
							<th class="px-4 py-2.5 text-right font-medium text-gray-500">Total</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.recentOrders as order}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3 font-mono text-xs text-gray-600">
									<a href="/dashboard/orders/{order.id}" class="hover:underline">{order.orderNumber}</a>
								</td>
								<td class="px-4 py-3 text-gray-700">{order.customerName ?? '—'}</td>
								<td class="px-4 py-3 text-gray-500 capitalize">{order.type}</td>
								<td class="px-4 py-3">
									<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}">
										{order.status}
									</span>
								</td>
								<td class="px-4 py-3 text-right font-medium text-gray-900">${(order.total / 100).toFixed(2)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{:else}
		<div class="rounded-xl border border-dashed border-gray-300 p-10 text-center">
			<p class="text-gray-400 text-sm">No orders yet. Share your menu to start receiving orders.</p>
		</div>
	{/if}
</div>
