<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '$lib/components/ui/table';

	let { data }: { data: PageData } = $props();

	const lastUpdated = new SvelteDate();

	onMount(() => {
		let interval: ReturnType<typeof setInterval> | null = null;
		function refresh() {
			invalidate('app:overview');
			lastUpdated.setTime(Date.now());
		}
		function start() {
			if (!interval) interval = setInterval(refresh, 15_000);
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
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Menu Items</p>
				<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.items}</p>
				<a
					href={resolve('/dashboard/menu/items')}
					class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-green-600 transition-colors hover:text-green-800"
				>
					Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" />
				</a>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Categories</p>
				<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.categories}</p>
				<a
					href={resolve('/dashboard/menu/categories')}
					class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-green-600 transition-colors hover:text-green-800"
				>
					Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" />
				</a>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Total Orders</p>
				<p class="mt-1 text-3xl font-bold text-gray-900">{data.stats.orders}</p>
				{#if data.stats.pendingOrders > 0}
					<p class="mt-1 text-xs text-yellow-600">{data.stats.pendingOrders} pending</p>
				{/if}
				<a
					href={resolve('/dashboard/orders')}
					class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-green-600 transition-colors hover:text-green-800"
				>
					View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
				</a>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Revenue</p>
				<p class="mt-1 text-3xl font-bold text-gray-900">${(data.stats.revenue / 100).toFixed(2)}</p>
			</CardContent>
		</Card>
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
			class="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100"
		>
			Manage categories
		</a>
		<a
			href={resolve('/dashboard/orders')}
			class="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100"
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
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
					</span>
					Live · updated {lastUpdated.toLocaleTimeString([], {
						hour: '2-digit',
						minute: '2-digit',
						second: '2-digit'
					})}
				</span>
			</div>
			<Card class="shadow-sm">
				<Table>
					<TableHeader class="bg-gray-50">
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-2.5 text-gray-500">Order</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-gray-500 sm:table-cell">Customer</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-gray-500 md:table-cell">Type</TableHead>
							<TableHead class="px-4 py-2.5 text-gray-500">Status</TableHead>
							<TableHead class="px-4 py-2.5 text-right text-gray-500">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.recentOrders as order (order.id)}
							<TableRow>
								<TableCell class="px-4 py-3 font-mono text-xs text-gray-600">
									<a href={resolve(`/dashboard/orders/${order.id}`)} class="hover:underline">{order.orderNumber}</a>
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-gray-700 sm:table-cell">{order.customerName ?? '—'}</TableCell>
								<TableCell class="hidden px-4 py-3 text-gray-500 capitalize md:table-cell">{order.type}</TableCell>
								<TableCell class="px-4 py-3">
									<Badge class={statusColors[order.status] ?? 'bg-gray-100 text-gray-600'}>
										{order.status}
									</Badge>
								</TableCell>
								<TableCell class="px-4 py-3 text-right font-medium text-gray-900">${(order.total / 100).toFixed(2)}</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</Card>
		</div>
	{:else}
		<div class="rounded-xl border border-dashed border-gray-300 p-10 text-center">
			<p class="text-sm text-gray-400">No orders yet. Share your menu to start receiving orders.</p>
		</div>
	{/if}
</div>
