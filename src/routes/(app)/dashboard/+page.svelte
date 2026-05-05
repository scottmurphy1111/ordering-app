<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { Button } from '$lib/components/ui/button';
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
	import { lifecycleStages } from '$lib/utils/order-lifecycle';

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

	function fmtTime(d: Date | string, tz: string): string {
		const date = typeof d === 'string' ? new Date(d) : d;
		return new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
			.format(date)
			.toLowerCase()
			.replace(' ', '');
	}

	function fmtTimeRange(start: Date | string, end: Date | string, tz: string): string {
		return `${fmtTime(start, tz)}–${fmtTime(end, tz)}`;
	}

	function fmtWeekday(d: Date | string, tz: string): string {
		const date = typeof d === 'string' ? new Date(d) : d;
		return new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			weekday: 'long'
		}).format(date);
	}
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
				<Button variant="outline" onclick={copyCatalogLink} class="gap-1.5">
					<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
					{copied ? 'Copied!' : 'Copy link'}
				</Button>
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
						class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-green-700"
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
						class="mt-2 inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-green-700"
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
								class="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors hover:text-green-700"
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
				href={resolve('/dashboard/catalog/items?drawer=new')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div
					class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
				>
					<Icon icon="mdi:plus" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">Add catalog item</p>
					<p class="mt-0.5 text-xs text-muted-foreground">Add a new item to your catalog</p>
				</div>
			</a>
			<a
				href={resolve('/dashboard/catalog/categories')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div
					class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
				>
					<Icon icon="mdi:view-grid-outline" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">Manage categories</p>
					<p class="mt-0.5 text-xs text-muted-foreground">Organize your catalog sections</p>
				</div>
			</a>
			<a
				href={resolve('/dashboard/orders')}
				class="flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-gray-300 hover:shadow-sm"
			>
				<div
					class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
				>
					<Icon icon="mdi:clipboard-list-outline" class="h-4 w-4 text-primary" />
				</div>
				<div>
					<p class="text-sm font-semibold text-foreground">View orders</p>
					<p class="mt-0.5 text-xs text-muted-foreground">See all incoming orders</p>
				</div>
			</a>
		</div>
	</section>

	<!-- Day card snippet -->
	{#snippet dayCard(label: string, dayData: typeof data.horizon.today)}
		<Card class="shadow-sm">
			<CardContent>
				<div class="mb-3">
					<h3 class="text-sm font-semibold text-foreground">{label}</h3>
				</div>

				{#if !mounted}
					<div class="mb-3">
						<Skeleton class="mb-1.5 h-3 w-16 rounded" />
						<div class="h-16 space-y-1">
							<Skeleton class="h-3 w-3/4 rounded" />
							<Skeleton class="h-3 w-1/2 rounded" />
						</div>
					</div>
					<div class="mb-3 border-t pt-3">
						<Skeleton class="mb-1.5 h-3 w-16 rounded" />
						<div class="h-40 space-y-1.5">
							<Skeleton class="h-3 w-full rounded" />
							<Skeleton class="h-3 w-full rounded" />
							<Skeleton class="h-3 w-full rounded" />
							<Skeleton class="h-3 w-4/5 rounded" />
						</div>
					</div>
					<div class="border-t pt-3">
						<Skeleton class="mb-1.5 h-3 w-20 rounded" />
						<div class="h-32 space-y-1.5">
							<Skeleton class="h-3 w-full rounded" />
							<Skeleton class="h-3 w-3/4 rounded" />
							<Skeleton class="h-3 w-full rounded" />
						</div>
					</div>
				{:else}
					<!-- Pickup windows -->
					<div class="mb-3">
						<h4 class="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
							Windows
						</h4>
						<div class="h-16 overflow-y-auto">
							{#if dayData.windows.length > 0}
								<ul class="space-y-1">
									{#each dayData.windows as w (w.id)}
										<li>
											<span class="text-xs text-foreground"
												>{fmtTimeRange(w.startsAt, w.endsAt, data.vendorTimezone)}</span
											>
											{#if w.locationName}
												<span class="block text-xs text-gray-500">{w.locationName}</span>
											{/if}
										</li>
									{/each}
								</ul>
							{:else}
								<p class="text-xs text-gray-400">No pickup windows</p>
							{/if}
						</div>
					</div>

					<!-- Orders -->
					<div class="mb-3 border-t pt-3">
						<h4 class="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">Orders</h4>
						<div class="h-40 overflow-y-auto">
							{#if dayData.orders.length > 0}
								{@const shown = dayData.orders.slice(0, 5)}
								{@const remaining = dayData.orders.length - shown.length}
								<ul class="space-y-1">
									{#each shown as o (o.id)}
										<li>
											<a
												href={resolve(`/dashboard/orders/${o.id}`)}
												class="flex items-center gap-2 text-xs hover:text-primary"
											>
												<span class="font-mono text-gray-400">{shortOrderId(o.orderNumber)}</span>
												<span class="min-w-0 flex-1 truncate text-gray-600"
													>{o.customerName ?? '—'}</span
												>
												<span class="shrink-0 font-medium text-gray-900"
													>${(o.total / 100).toFixed(2)}</span
												>
											</a>
										</li>
									{/each}
								</ul>
								{#if remaining > 0}
									<a
										href={resolve('/dashboard/orders')}
										class="mt-1.5 inline-block text-xs text-primary hover:underline"
									>
										+{remaining} more
									</a>
								{/if}
							{:else}
								<p class="text-xs text-gray-400">No orders</p>
							{/if}
						</div>
					</div>

					<!-- Production -->
					<div class="border-t pt-3">
						<h4 class="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">
							Production
						</h4>
						<div class="h-32 overflow-y-auto">
							{#if dayData.production.length > 0}
								<ul class="space-y-1">
									{#each dayData.production as p, i (i)}
										<li class="flex items-center justify-between gap-2">
											<div class="min-w-0 flex-1">
												<span class="truncate text-xs text-foreground">{p.itemName}</span>
												{#if p.modifiers.length > 0}
													<span class="block truncate text-xs text-gray-500"
														>{p.modifiers.join(', ')}</span
													>
												{/if}
											</div>
											<span class="shrink-0 text-xs font-semibold text-foreground tabular-nums"
												>{p.totalQuantity}×</span
											>
										</li>
									{/each}
								</ul>
								<a
									href={resolve('/dashboard/orders?view=production')}
									class="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
								>
									View production <Icon icon="mdi:arrow-right" class="h-3 w-3" />
								</a>
							{:else}
								<p class="text-xs text-gray-400">Nothing to prep</p>
							{/if}
						</div>
					</div>
				{/if}
			</CardContent>
		</Card>
	{/snippet}

	<!-- Lower sections -->
	<div class="space-y-6">
		<!-- Recent orders -->
		<div>
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
							<span class="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
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
								<TableHead class="hidden text-right sm:table-cell">Total</TableHead>
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
										{@const stage = lifecycleStages.find((s) => s.value === order.status)}
										{#if stage}
											<span class="inline-flex items-center gap-1.5">
												<Icon icon={stage.icon} class="h-3.5 w-3.5 text-primary" />
												<span class="text-xs font-medium text-gray-700">{stage.label}</span>
											</span>
										{:else if order.status === 'cancelled'}
											<span class="inline-flex items-center gap-1.5">
												<Icon icon="mdi:close-circle" class="h-3.5 w-3.5 text-red-500" />
												<span class="text-xs font-medium text-gray-700">Cancelled</span>
											</span>
										{:else if order.status === 'scheduled'}
											<span class="inline-flex items-center gap-1.5">
												<Icon icon="mdi:calendar-clock" class="h-3.5 w-3.5 text-amber-600" />
												<span class="text-xs font-medium text-gray-700">Scheduled</span>
											</span>
										{:else}
											<span class="inline-flex items-center gap-1.5">
												<Icon icon="mdi:help-circle-outline" class="h-3.5 w-3.5 text-gray-400" />
												<span class="text-xs font-medium text-gray-700">{order.status}</span>
											</span>
										{/if}
									</TableCell>
									<TableCell class="hidden text-right font-medium sm:table-cell">
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
							href={resolve('/dashboard/orders')}
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

		<!-- 3-day horizon grid -->
		<section>
			<h2 class="mb-3 text-base font-semibold text-foreground">Next 3 days</h2>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				{@render dayCard('Today', data.horizon.today)}
				{@render dayCard('Tomorrow', data.horizon.tomorrow)}
				{@render dayCard(
					fmtWeekday(data.horizon.dayAfterDate, data.vendorTimezone),
					data.horizon.dayAfter
				)}
			</div>
		</section>
	</div>
</div>
