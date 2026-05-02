<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import SetupChecklist from '$lib/components/SetupChecklist.svelte';
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
	let copied = $state(false);
	let catalogUrl = $state('');

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		if (h < 12) return 'Good morning';
		if (h < 17) return 'Good afternoon';
		return 'Good evening';
	});

	const firstName = $derived(data.user?.name?.split(' ')[0] ?? '');

	onMount(() => {
		mounted = true;
		if (data.vendor?.slug) {
			catalogUrl = `${window.location.origin}${resolve(`/${data.vendor.slug}/catalog`)}`;
		}
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

	function copyCatalogLink() {
		if (!catalogUrl) return;
		navigator.clipboard.writeText(catalogUrl).then(() => {
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		});
	}

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

	function capitalize(s: string): string {
		return s.charAt(0).toUpperCase() + s.slice(1);
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

	const pickupCount = $derived(
		data.orderTypeSplit.find((t) => t.type === 'pickup')?.count ?? 0
	);
	const deliveryCount = $derived(
		data.orderTypeSplit.find((t) => t.type === 'delivery')?.count ?? 0
	);
	const totalSplitCount = $derived(pickupCount + deliveryCount);
	const pickupPct = $derived(
		totalSplitCount > 0 ? Math.round((pickupCount / totalSplitCount) * 100) : 0
	);
</script>

<div>
	<!-- Header -->
	<div class="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">
				{greeting}{firstName ? `, ${firstName}` : ''} 👋
			</h1>
			{#if data.vendor?.name}
				<p class="mt-0.5 text-sm text-muted-foreground">
					Here's what's happening with {data.vendor.name}.
				</p>
			{/if}
			{#if catalogUrl}
				<p class="mt-0.5 text-xs text-muted-foreground/70">
					{catalogUrl.replace(/^https?:\/\//, '')}
				</p>
			{/if}
		</div>
		{#if data.vendor?.slug}
			<div class="flex items-center gap-2">
				<button
					onclick={copyCatalogLink}
					class="inline-flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:border-gray-400 hover:bg-muted"
				>
					<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
					{copied ? 'Copied!' : 'Copy link'}
				</button>
				<a
					data-tour="view-catalog"
					href={resolve(`/${data.vendor.slug}/catalog`)}
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 rounded-md border border-primary px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
				>
					Open live catalog <Icon icon="mdi:open-in-new" class="h-3.5 w-3.5" />
				</a>
			</div>
		{/if}
	</div>

	{#if !data.setupChecklist.allComplete}
		<SetupChecklist checklist={data.setupChecklist} />
	{/if}

	<!-- Stats grid -->
	<div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
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
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Items</p>
					<p class="mt-1 text-3xl font-bold text-foreground">{data.stats.items}</p>
					<a
						href={resolve('/dashboard/catalog/items')}
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
						href={resolve('/dashboard/catalog/categories')}
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
					<div class="mt-2 flex items-center gap-2">
						{#if data.stats.pendingOrders > 0}
							<a
								href={resolve('/dashboard/orders')}
								class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-200"
							>
								<Icon icon="mdi:clock-outline" class="h-3 w-3" />
								{data.stats.pendingOrders} pending
							</a>
						{:else}
							<a
								href={resolve('/dashboard/orders')}
								class="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/90"
							>
								View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
							</a>
						{/if}
					</div>
				</CardContent>
			</Card>

			<Card class="shadow-sm">
				<CardContent>
					<p class="text-xs font-medium tracking-wide text-muted-foreground">Revenue</p>
					<p class="mt-1 text-3xl font-bold text-foreground">
						${(data.stats.revenue / 100).toFixed(2)}
					</p>
					<div class="mt-2 flex items-center gap-1.5">
						{#if data.stats.revenue > 0}
							<Icon icon="mdi:trending-up" class="h-3.5 w-3.5 text-emerald-500" />
							<span class="text-xs text-emerald-600">All time</span>
						{:else}
							<span class="text-xs text-muted-foreground">No orders yet</span>
						{/if}
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>

	<!-- Quick actions -->
	<section class="mb-8">
		<h2 class="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			Quick actions
		</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
			<a
				href={resolve('/dashboard/catalog/items/new')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon icon="mdi:plus" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">Add catalog item</p>
					<p class="mt-0.5 text-xs text-muted-foreground">Add a new item to your menu</p>
				</div>
			</a>
			<a
				href={resolve('/dashboard/catalog/categories')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon icon="mdi:view-grid-outline" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">Manage categories</p>
					<p class="mt-0.5 text-xs text-muted-foreground">Organise your menu sections</p>
				</div>
			</a>
			<a
				href={resolve('/dashboard/orders')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
					<Icon icon="mdi:clipboard-list-outline" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">View orders</p>
					<p class="mt-0.5 text-xs text-muted-foreground">See all incoming orders</p>
				</div>
			</a>
		</div>
	</section>

	<!-- Lower grid: recent orders + sidebar -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
		<!-- Recent orders (2/3 width) -->
		<div class="lg:col-span-2">
			{#if !mounted}
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
			{:else if data.recentOrders.length > 0}
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
				<Card class="overflow-hidden p-0 shadow-sm">
					<Table>
						<TableHeader>
							<TableRow class="hover:bg-transparent">
								<TableHead>Order</TableHead>
								<TableHead class="hidden sm:table-cell">Customer</TableHead>
								<TableHead>Status</TableHead>
								<TableHead class="hidden sm:table-cell text-right">Total</TableHead>
								<TableHead class="text-right">When</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.recentOrders as order (order.id)}
								<TableRow
									class="cursor-pointer hover:bg-muted/50"
									onclick={() => (window.location.href = resolve(`/dashboard/orders/${order.id}`))}
								>
									<TableCell class="font-mono text-xs font-medium">
										{shortOrderId(order.orderNumber)}
									</TableCell>
									<TableCell class="hidden sm:table-cell">{order.customerName ?? '—'}</TableCell>
									<TableCell>
										<Badge class={getStatusBadge(order.status)}>
											{capitalize(order.status)}
										</Badge>
									</TableCell>
									<TableCell class="hidden sm:table-cell text-right font-medium">
										${(order.total / 100).toFixed(2)}
									</TableCell>
									<TableCell class="text-right text-xs text-muted-foreground">
										{formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
					<div class="flex items-center justify-between border-t px-4 py-3">
						<span class="text-xs text-muted-foreground">
							Showing {data.recentOrders.length} of {data.stats.orders} orders
						</span>
						<a
							href={resolve('/dashboard/orders/history')}
							class="text-xs font-medium text-primary hover:underline"
						>
							View all orders →
						</a>
					</div>
				</Card>
			{:else}
				<div class="rounded-xl border border-dashed p-10 text-center">
					<p class="text-sm text-muted-foreground">
						No orders yet. Share your catalog to start receiving orders.
					</p>
				</div>
			{/if}
		</div>

		<!-- Sidebar (1/3 width) -->
		<div class="space-y-4">
			<!-- Top items -->
			<Card class="shadow-sm">
				<CardContent>
					<h3 class="mb-3 text-sm font-semibold text-foreground">Top items</h3>
					{#if !mounted}
						<div class="space-y-2">
							{#each [0, 1, 2] as i (i)}
								<Skeleton class="h-4 w-full rounded" />
							{/each}
						</div>
					{:else if data.topItems.length > 0}
						<ul class="space-y-2.5">
							{#each data.topItems as item, i (item.name)}
								<li class="flex items-center justify-between gap-2">
									<div class="flex min-w-0 items-center gap-2">
										<span class="text-xs font-medium tabular-nums text-muted-foreground w-4">{i + 1}</span>
										<span class="truncate text-sm text-foreground">{item.name}</span>
									</div>
									<span class="shrink-0 text-xs font-semibold text-muted-foreground">{item.qty}×</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-xs text-muted-foreground">No order data yet.</p>
					{/if}
				</CardContent>
			</Card>

			<!-- Order type split -->
			<Card class="shadow-sm">
				<CardContent>
					<h3 class="mb-3 text-sm font-semibold text-foreground">Order type</h3>
					{#if !mounted}
						<Skeleton class="h-24 w-full rounded" />
					{:else if totalSplitCount > 0}
						<div class="space-y-3">
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-xs text-muted-foreground">Pickup</span>
									<span class="text-xs font-semibold text-foreground">{pickupPct}%</span>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div class="h-full rounded-full bg-primary" style="width:{pickupPct}%"></div>
								</div>
								<p class="mt-0.5 text-xs text-muted-foreground">{pickupCount} orders</p>
							</div>
							<div>
								<div class="mb-1 flex items-center justify-between">
									<span class="text-xs text-muted-foreground">Delivery</span>
									<span class="text-xs font-semibold text-foreground">{100 - pickupPct}%</span>
								</div>
								<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
									<div class="h-full rounded-full bg-blue-500" style="width:{100 - pickupPct}%"></div>
								</div>
								<p class="mt-0.5 text-xs text-muted-foreground">{deliveryCount} orders</p>
							</div>
						</div>
					{:else}
						<p class="text-xs text-muted-foreground">No order data yet.</p>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>
</div>
