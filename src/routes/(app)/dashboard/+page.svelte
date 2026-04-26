<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';

	let { data }: { data: PageData } = $props();

	const lastUpdated = new SvelteDate();
	let mounted = $state(false);

	onMount(() => {
		mounted = true;
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

	function getStatusBadge(status: string): string {
		const map: Record<string, string> = {
			pending: 'bg-amber-100 text-amber-700',
			received: 'bg-gray-100 text-gray-600',
			confirmed: 'bg-purple-100 text-purple-700',
			preparing: 'bg-blue-100 text-blue-700',
			ready: 'bg-teal-100 text-teal-700',
			fulfilled: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700'
		};
		return map[status] ?? 'bg-gray-100 text-gray-600';
	}

	function shortOrderId(num: string): string {
		const dash = num.lastIndexOf('-');
		return dash !== -1 ? '#' + num.slice(dash + 1) : num;
	}

	function relativeTime(date: Date): string {
		const diff = Math.floor((Date.now() - date.getTime()) / 1000);
		if (diff < 60) return 'just now';
		if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
		return `${Math.floor(diff / 3600)} hr ago`;
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-foreground">Overview</h1>
		{#if data.tenant?.slug}
			<a
				data-tour="view-menu"
				href={resolve(`/${data.tenant.slug}/menu`)}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
			>
				Open live menu <Icon icon="mdi:open-in-new" class="h-3.5 w-3.5" />
			</a>
		{/if}
	</div>

	<!-- Stats grid -->
	<div class="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
		{#if !mounted}
			{#each [0, 1, 2, 3] as i (i)}
				<Card class="shadow-sm">
					<CardContent>
						<Skeleton class="h-3 w-20 rounded" />
						<Skeleton class="mt-2 h-8 w-14 rounded" />
						<Skeleton class="mt-3 h-3 w-12 rounded" />
					</CardContent>
				</Card>
			{/each}
		{:else}
			<Card class="shadow-sm">
				<CardContent>
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Menu Items</p>
					<p class="mt-1 text-3xl font-bold text-foreground">{data.stats.items}</p>
					<a
						href={resolve('/dashboard/menu/items')}
						class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/90"
					>
						Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" />
					</a>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent>
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Categories</p>
					<p class="mt-1 text-3xl font-bold text-foreground">{data.stats.categories}</p>
					<a
						href={resolve('/dashboard/menu/categories')}
						class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/90"
					>
						Manage <Icon icon="mdi:chevron-right" class="h-3 w-3" />
					</a>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent>
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Total Orders</p>
					<p class="mt-1 text-3xl font-bold text-foreground">{data.stats.orders}</p>
					{#if data.stats.pendingOrders > 0}
						<p class="mt-1 text-xs text-amber-600">{data.stats.pendingOrders} pending</p>
					{/if}
					<a
						href={resolve('/dashboard/orders')}
						class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/90"
					>
						View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
					</a>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent>
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Revenue</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						${(data.stats.revenue / 100).toFixed(2)}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">all time</p>
				</CardContent>
			</Card>
		{/if}
	</div>

	<!-- Quick actions -->
	<div class="mb-8 flex flex-wrap gap-3">
		<a
			href={resolve('/dashboard/menu/items/new')}
			class="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
		>
			<Icon icon="mdi:plus" class="h-4 w-4" /> Add menu item
		</a>
		<a
			href={resolve('/dashboard/menu/categories')}
			class="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-gray-400 hover:bg-muted"
		>
			Manage categories
		</a>
		<a
			href={resolve('/dashboard/orders')}
			class="inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-gray-400 hover:bg-muted"
		>
			View orders
		</a>
	</div>

	<!-- Recent orders -->
	{#if !mounted}
		<div>
			<Skeleton class="mb-3 h-4 w-32 rounded" />
			<Card class="p-0 shadow-sm">
				<CardContent>
					<div class="space-y-4 py-2">
						{#each [0, 1, 2, 3] as i (i)}
							<div class="flex items-center gap-4">
								<Skeleton class="h-3 w-16 rounded" />
								<Skeleton class="h-3 w-24 rounded" />
								<Skeleton class="h-3 w-16 rounded" />
								<Skeleton class="ml-auto h-5 w-14 rounded-full" />
								<Skeleton class="h-3 w-10 rounded" />
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>
	{:else if data.recentOrders.length > 0}
		<div>
			<div class="mb-3 flex items-center gap-2">
				<h2 class="text-base font-semibold text-foreground">Recent orders</h2>
				<span class="flex items-center gap-1.5 text-xs text-muted-foreground">
					<span class="relative flex h-2 w-2">
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75"
						></span>
						<span class="relative inline-flex h-2 w-2 rounded-full bg-primary/100"></span>
					</span>
					Live · updated {relativeTime(lastUpdated)}
				</span>
			</div>
			<Card class="p-0 shadow-sm">
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow class="hover:bg-transparent">
								<TableHead>Order</TableHead>
								<TableHead class="hidden sm:table-cell">Customer</TableHead>
								<TableHead class="hidden md:table-cell">Type</TableHead>
								<TableHead>Status</TableHead>
								<TableHead class="text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.recentOrders as order (order.id)}
								<TableRow>
									<TableCell class="font-mono text-xs">
										<a href={resolve(`/dashboard/orders/${order.id}`)} class="hover:underline"
											>{shortOrderId(order.orderNumber)}</a
										>
									</TableCell>
									<TableCell class="hidden sm:table-cell">{order.customerName ?? '—'}</TableCell>
									<TableCell class="hidden capitalize md:table-cell">{order.type}</TableCell>
									<TableCell>
										<Badge class={getStatusBadge(order.status)}>
											{order.status}
										</Badge>
									</TableCell>
									<TableCell class="text-right font-medium"
										>${(order.total / 100).toFixed(2)}</TableCell
									>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	{:else}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="text-sm text-muted-foreground">
				No orders yet. Share your menu to start receiving orders.
			</p>
		</div>
	{/if}
</div>
