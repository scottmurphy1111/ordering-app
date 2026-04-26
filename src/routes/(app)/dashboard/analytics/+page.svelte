<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { SvelteMap } from 'svelte/reactivity';

	let { data }: { data: PageData } = $props();

	const {
		rangeDays,
		kpis,
		dailyData,
		topItems,
		statusBreakdown,
		typeBreakdown,
		hasAdvancedAnalytics,
		peakHoursGrid,
		customerRetention,
		revenueByCategory
	} = $derived(data);

	function fmt(cents: number) {
		return (
			'$' +
			(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		);
	}

	function fmtPct(val: number | null) {
		if (val === null) return null;
		const sign = val >= 0 ? '+' : '';
		return `${sign}${val.toFixed(1)}%`;
	}

	const maxDailyRevenue = $derived(Math.max(...dailyData.map((d) => d.revenue), 1));
	const totalStatusCount = $derived(statusBreakdown.reduce((s, r) => s + r.count, 0));

	const statusColors: Record<string, string> = {
		received: 'bg-blue-400',
		confirmed: 'bg-purple-400',
		preparing: 'bg-yellow-400',
		ready: 'bg-primary/70',
		fulfilled: 'bg-gray-300',
		cancelled: 'bg-red-300'
	};

	const statusBadge: Record<string, string> = {
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-primary/90',
		fulfilled: 'bg-muted text-muted-foreground',
		cancelled: 'bg-red-100 text-red-500'
	};

	const typeIcons: Record<string, string> = {
		pickup: 'mdi:bag-personal-outline',
		'dine-in': 'mdi:silverware-fork-knife',
		delivery: 'mdi:truck-delivery-outline'
	};

	const typeLabels: Record<string, string> = {
		pickup: 'Pickup',
		'dine-in': 'Dine-in',
		delivery: 'Delivery'
	};

	const totalTypeRevenue = $derived(typeBreakdown.reduce((s, r) => s + (r.revenue ?? 0), 0) || 1);
	const maxItemQty = $derived(Math.max(...topItems.map((i) => i.totalQty), 1));
	const maxCategoryRevenue = $derived(
		Math.max(...(revenueByCategory ?? []).map((c) => c.totalRevenue), 1)
	);

	// ── Peak hours heatmap ───────────────────────────────────────────
	// DOW order: Mon(1) → Sun(0)
	const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
	const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const HOURS = Array.from({ length: 24 }, (_, i) => i);

	const heatmapLookup = $derived.by(() => {
		const map = new SvelteMap<string, number>();
		for (const row of peakHoursGrid ?? []) {
			map.set(`${row.dow}-${row.hour}`, row.count);
		}
		return map;
	});

	const maxHeatmapCount = $derived(Math.max(...(peakHoursGrid ?? []).map((r) => r.count), 1));

	function heatmapCell(dow: number, hour: number): { count: number; opacity: number } {
		const count = heatmapLookup.get(`${dow}-${hour}`) ?? 0;
		const opacity = count === 0 ? 0 : Math.max(0.08, count / maxHeatmapCount);
		return { count, opacity };
	}

	function fmtHour(h: number): string {
		if (h === 0) return '12a';
		if (h === 12) return '12p';
		return h < 12 ? `${h}a` : `${h - 12}p`;
	}
</script>

<div>
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Analytics</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Last {rangeDays} days vs previous {rangeDays} days.
			</p>
		</div>
		<div class="flex items-center gap-1 rounded-xl border bg-background p-1 shadow-sm self-start">
			{#each [[7, '7 days'], [30, '30 days']] as const as [d, label] (d)}
				<a
					href={resolve(d === 30 ? '/dashboard/analytics' : `/dashboard/analytics?range=${d}`)}
					class="rounded-lg px-4 py-1.5 text-xs font-medium transition-colors
						{rangeDays === d
						? 'bg-gray-900 text-white'
						: 'text-muted-foreground hover:text-foreground'}"
				>{label}</a>
			{/each}
		</div>
	</div>

	<!-- ── KPI cards ────────────────────────────────────────────── -->
	<div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Revenue</p>
				<p class="mt-1.5 text-3xl font-bold text-foreground">{fmt(kpis.revenue)}</p>
				{#if kpis.revenueChange !== null}
					<p class="mt-1 text-xs {kpis.revenueChange >= 0 ? 'text-primary' : 'text-red-500'}">
						{fmtPct(kpis.revenueChange)} vs prior period
					</p>
				{/if}
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Orders</p>
				<p class="mt-1.5 text-3xl font-bold text-foreground">{kpis.ordersCount}</p>
				{#if kpis.ordersChange !== null}
					<p class="mt-1 text-xs {kpis.ordersChange >= 0 ? 'text-primary' : 'text-red-500'}">
						{fmtPct(kpis.ordersChange)} vs prior period
					</p>
				{/if}
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Avg Order</p>
				<p class="mt-1.5 text-3xl font-bold text-foreground">{fmt(kpis.avgOrderValue)}</p>
				{#if kpis.avgChange !== null}
					<p class="mt-1 text-xs {kpis.avgChange >= 0 ? 'text-primary' : 'text-red-500'}">
						{fmtPct(kpis.avgChange)} vs prior period
					</p>
				{/if}
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Fulfilment rate
				</p>
				{#if kpis.fulfilledRate !== null}
					<p class="mt-1.5 text-3xl font-bold text-foreground">{kpis.fulfilledRate}%</p>
					<p class="mt-1 text-xs text-muted-foreground">of paid orders fulfilled</p>
				{:else}
					<p class="mt-1.5 text-3xl font-bold text-foreground">—</p>
				{/if}
			</CardContent>
		</Card>
	</div>

	<!-- ── Daily revenue chart ──────────────────────────────────── -->
	<Card class="mb-6 shadow-sm">
		<CardContent>
			<h2 class="mb-4 text-sm font-semibold text-foreground">Daily revenue — last {rangeDays} days</h2>
			<div class="flex h-36 items-end gap-px">
				{#each dailyData as day (day.date)}
					{@const height =
						day.revenue === 0 ? 2 : Math.max(4, Math.round((day.revenue / maxDailyRevenue) * 144))}
					<div class="group relative flex flex-1 flex-col items-center justify-end">
						<div
							class="w-full rounded-sm bg-primary transition-colors group-hover:bg-primary/80"
							style="height: {height}px;"
						></div>
						{#if day.revenue > 0}
							<div
								class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
							>
								<div
									class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
								>
									<p>{fmt(day.revenue)}</p>
									<p class="text-muted-foreground">
										{day.count}
										{day.count === 1 ? 'order' : 'orders'}
									</p>
								</div>
								<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-1.5 flex justify-between text-xs text-muted-foreground">
				<span>{dailyData[0]?.date.slice(5)}</span>
				<span>{dailyData[Math.floor(dailyData.length / 2)]?.date.slice(5)}</span>
				<span>{dailyData[dailyData.length - 1]?.date.slice(5)}</span>
			</div>
		</CardContent>
	</Card>

	<!-- ── Bottom grid ───────────────────────────────────────────── -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Top items -->
		<Card class="shadow-sm lg:col-span-2">
			<CardContent>
				<h2 class="mb-4 text-sm font-semibold text-foreground">Top items</h2>
				{#if topItems.length === 0}
					<p class="text-sm text-muted-foreground">No order data yet.</p>
				{:else}
					<div class="space-y-3">
						{#each topItems as item, i (item.name)}
							<div>
								<div class="mb-1 flex items-center justify-between gap-2">
									<div class="flex min-w-0 items-center gap-2">
										<span class="w-4 shrink-0 text-xs font-bold text-muted-foreground">#{i + 1}</span>
										<span class="truncate text-sm font-medium text-foreground">{item.name}</span>
									</div>
									<div class="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
										<span>{item.totalQty} sold</span>
										<span class="font-medium text-muted-foreground">{fmt(item.totalRevenue)}</span>
									</div>
								</div>
								<div class="h-1.5 w-full rounded-full bg-muted">
									<div
										class="h-1.5 rounded-full bg-primary transition-all"
										style="width: {Math.round((item.totalQty / maxItemQty) * 100)}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Right column -->
		<div class="space-y-6">
			<!-- Order types -->
			<Card class="shadow-sm">
				<CardContent>
					<h2 class="mb-3 text-sm font-semibold text-foreground">Order types</h2>
					{#if typeBreakdown.length === 0}
						<p class="text-sm text-muted-foreground">No data yet.</p>
					{:else}
						<div class="space-y-2.5">
							{#each typeBreakdown as row (row.type)}
								<div>
									<div class="mb-1 flex items-center justify-between text-xs">
										<span class="inline-flex items-center gap-1 text-muted-foreground">
											<Icon icon={typeIcons[row.type] ?? 'mdi:food'} class="h-3.5 w-3.5" />
											{typeLabels[row.type] ?? row.type}
										</span>
										<span class="font-medium text-muted-foreground">{fmt(row.revenue ?? 0)}</span>
									</div>
									<div class="h-1.5 w-full rounded-full bg-muted">
										<div
											class="h-1.5 rounded-full bg-primary"
											style="width: {Math.round(((row.revenue ?? 0) / totalTypeRevenue) * 100)}%"
										></div>
									</div>
									<p class="mt-0.5 text-right text-xs text-muted-foreground">{row.count} orders</p>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Status breakdown -->
			<Card class="shadow-sm">
				<CardContent>
					<h2 class="mb-3 text-sm font-semibold text-foreground">By status (30d)</h2>
					{#if statusBreakdown.length === 0}
						<p class="text-sm text-muted-foreground">No data yet.</p>
					{:else}
						<div class="mb-3 flex h-3 w-full overflow-hidden rounded-full">
							{#each statusBreakdown as row (row.status)}
								<div
									class="{statusColors[row.status] ?? 'bg-muted'} transition-all"
									style="width: {Math.round((row.count / totalStatusCount) * 100)}%"
									title="{row.status}: {row.count}"
								></div>
							{/each}
						</div>
						<div class="space-y-1.5">
							{#each statusBreakdown as row (row.status)}
								<div class="flex items-center justify-between text-xs">
									<span class="inline-flex items-center gap-1.5">
										<span class="h-2 w-2 rounded-full {statusColors[row.status] ?? 'bg-gray-300'}"
										></span>
										<span
											class="rounded-full px-1.5 py-0.5 {statusBadge[row.status] ??
												'bg-muted text-muted-foreground'} capitalize"
										>
											{row.status}
										</span>
									</span>
									<span class="font-medium text-muted-foreground">{row.count}</span>
								</div>
							{/each}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	</div>

	<!-- ── Advanced Analytics ────────────────────────────────────── -->
	{#if hasAdvancedAnalytics}
		<div class="mt-10">
			<div class="mb-5 flex items-center gap-3">
				<h2 class="text-lg font-semibold text-foreground">Advanced Analytics</h2>
				<Badge class="inline-flex items-center gap-1 bg-amber-100 text-amber-800">
					<Icon icon="mdi:star" class="h-3 w-3" />Pro
				</Badge>
			</div>

			<!-- Peak hours heatmap -->
			<Card class="mb-6 shadow-sm">
				<CardHeader class="border-b pb-3">
					<CardTitle class="text-sm font-semibold">Peak hours — last 90 days</CardTitle>
				</CardHeader>
				<CardContent class="pt-4">
					{#if (peakHoursGrid ?? []).length === 0}
						<p class="text-sm text-muted-foreground">Not enough order data yet.</p>
					{:else}
						<div class="overflow-x-auto">
							<div class="min-w-130">
								<!-- Hour labels -->
								<div class="mb-1 flex">
									<div class="w-10 shrink-0"></div>
									<div class="flex flex-1 text-[10px] text-muted-foreground">
										{#each HOURS as h (h)}
											<div class="flex-1 text-center">
												{h % 6 === 0 ? fmtHour(h) : ''}
											</div>
										{/each}
									</div>
								</div>
								<!-- Grid rows -->
								{#each DOW_ORDER as dow, di (dow)}
									<div class="mb-0.5 flex items-center gap-1">
										<div class="w-10 shrink-0 text-right text-[10px] text-muted-foreground">
											{DOW_LABELS[di]}
										</div>
										<div class="flex flex-1 gap-0.5">
											{#each HOURS as h (h)}
												{@const cell = heatmapCell(dow, h)}
												<div class="group relative flex-1">
													<div
														class="h-5 w-full rounded-sm"
														style="background-color: oklch(0.612 0.17 152.75 / {cell.opacity});"
													></div>
													{#if cell.count > 0}
														{#if di < 3}
															<!-- top rows: tooltip below to avoid clipping -->
															<div class="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex">
																<div class="-mb-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
																<div class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
																	<p>{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-muted-foreground">{cell.count} {cell.count === 1 ? 'order' : 'orders'}</p>
																</div>
															</div>
														{:else}
															<!-- bottom rows: tooltip above -->
															<div class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex">
																<div class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
																	<p>{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-muted-foreground">{cell.count} {cell.count === 1 ? 'order' : 'orders'}</p>
																</div>
																<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
															</div>
														{/if}
													{/if}
												</div>
											{/each}
										</div>
									</div>
								{/each}
								<!-- Legend -->
								<div class="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
									<span>Fewer</span>
									<div class="flex gap-0.5">
										{#each [0.08, 0.25, 0.45, 0.65, 1] as op (op)}
											<div
												class="h-3 w-4 rounded-sm"
												style="background-color: oklch(0.612 0.17 152.75 / {op});"
											></div>
										{/each}
									</div>
									<span>More</span>
								</div>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Customer retention + Top items by revenue -->
			<div class="grid gap-6 lg:grid-cols-3">
				<!-- Customer retention -->
				<Card class="shadow-sm">
					<CardHeader class="border-b pb-3">
						<CardTitle class="text-sm font-semibold">Customer retention</CardTitle>
					</CardHeader>
					<CardContent class="pt-4">
						{#if !customerRetention || customerRetention.total === 0}
							<p class="text-sm text-muted-foreground">Not enough customer data yet.</p>
						{:else}
							<div class="space-y-4">
								<div>
									<p class="text-3xl font-bold text-foreground">{customerRetention.returnRate}%</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										return rate · {customerRetention.returning} customers
									</p>
								</div>

								<!-- Bar visualization -->
								<div class="space-y-2">
									<div>
										<div class="mb-1 flex items-center justify-between text-xs">
											<span class="text-muted-foreground">Returning customers</span>
											<span class="font-medium text-foreground">{customerRetention.returning}</span>
										</div>
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-2 rounded-full bg-primary transition-all"
												style="width: {customerRetention.returnRate}%"
											></div>
										</div>
									</div>
									<div>
										<div class="mb-1 flex items-center justify-between text-xs">
											<span class="text-muted-foreground">First-time customers</span>
											<span class="font-medium text-foreground"
												>{customerRetention.total - customerRetention.returning}</span
											>
										</div>
										<div class="h-2 w-full rounded-full bg-muted">
											<div
												class="h-2 rounded-full bg-gray-400 transition-all"
												style="width: {100 - customerRetention.returnRate}%"
											></div>
										</div>
									</div>
								</div>

								<p class="text-xs text-muted-foreground">
									{customerRetention.total} unique customers identified by email.
								</p>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Revenue by category -->
				<Card class="shadow-sm lg:col-span-2">
					<CardHeader class="border-b pb-3">
						<CardTitle class="text-sm font-semibold">Revenue by category</CardTitle>
					</CardHeader>
					<CardContent class="pt-4">
						{#if !revenueByCategory || revenueByCategory.length === 0}
							<p class="text-sm text-muted-foreground">No order data yet.</p>
						{:else}
							<div class="space-y-3">
								{#each revenueByCategory as cat (cat.category)}
									<div>
										<div class="mb-1 flex items-center justify-between gap-2">
											<span class="truncate text-sm font-medium text-foreground">{cat.category}</span>
											<div class="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
												<span>{cat.totalQty} sold</span>
												<span class="font-medium text-foreground">{fmt(cat.totalRevenue)}</span>
											</div>
										</div>
										<div class="h-1.5 w-full rounded-full bg-muted">
											<div
												class="h-1.5 rounded-full bg-primary transition-all"
												style="width: {Math.round((cat.totalRevenue / maxCategoryRevenue) * 100)}%"
											></div>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>
		</div>

		<!-- ── Upsell card ───────────────────────────────────────────── -->
	{:else}
		<div class="mt-10">
			<Card class="shadow-sm">
				<CardContent class="py-8">
					<div class="mx-auto max-w-md text-center">
						<div
							class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"
						>
							<Icon icon="mdi:chart-line" class="h-6 w-6 text-primary" />
						</div>
						<h3 class="mb-1 text-base font-semibold text-foreground">Advanced Analytics</h3>
						<p class="mb-5 text-sm text-muted-foreground">
							Go beyond the basics. Understand when your customers order, who keeps coming back, and
							which items actually drive revenue.
						</p>
						<ul class="mb-6 space-y-2 text-left">
							{#each [
								{ icon: 'mdi:clock-outline', label: 'Peak hours heatmap — find your busiest day/time combinations' },
								{ icon: 'mdi:account-group-outline', label: 'Customer retention — new vs. returning, return rate over time' },
								{ icon: 'mdi:trophy-outline', label: 'Top items by revenue vs. volume — they rank differently' }
							] as feat (feat.label)}
								<li class="flex items-start gap-2.5 text-sm text-muted-foreground">
									<Icon icon={feat.icon} class="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
									{feat.label}
								</li>
							{/each}
						</ul>
						<Button href={resolve('/dashboard/settings/billing')} class="gap-2">
							<Icon icon="mdi:arrow-up-circle-outline" class="h-4 w-4" />
							Unlock for $19/mo
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
