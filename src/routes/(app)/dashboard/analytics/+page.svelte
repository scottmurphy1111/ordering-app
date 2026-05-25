<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import { Calendar } from '$lib/components/ui/calendar';
	import { parseDate, type CalendarDate } from '@internationalized/date';
	import { SvelteMap, SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
	import OrdersSummaryBar from '$lib/components/OrdersSummaryBar.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { ADDONS } from '$lib/billing';

	const analyticsAddon = ADDONS.find((a) => a.key === 'analytics');

	let { data }: { data: PageData } = $props();

	const {
		rangeDays,
		kpis,
		dailyData,
		dailyDataPrev,
		recentOrdersForFilter,
		topItems,
		statusBreakdown,
		typeBreakdown,
		hasAdvancedAnalytics,
		peakHoursGrid,
		customerRetention,
		revenueByCategory,
		topItemsByRevenue
	} = $derived(data);

	// ── Range controls state ────────────────────────────────────────
	let fromOpen = $state(false);
	let toOpen = $state(false);

	const fromCalendarValue = $derived(data.fromDate ? parseDate(data.fromDate) : undefined);
	const toCalendarValue = $derived(data.toDate ? parseDate(data.toDate) : undefined);

	function formatPickerDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function setPreset(days: 7 | 30 | 90) {
		goto(
			resolve(
				(days === 30
					? '/dashboard/analytics'
					: `/dashboard/analytics?range=${days}`) as `/${string}`
			)
		);
	}

	function setCustomDate(which: 'from' | 'to', date: CalendarDate | undefined) {
		const p = new SvelteURLSearchParams();
		const nextFrom = which === 'from' ? date?.toString() : data.fromDate;
		const nextTo = which === 'to' ? date?.toString() : data.toDate;
		if (nextFrom) p.set('from', nextFrom);
		if (nextTo) p.set('to', nextTo);
		const qs = p.toString();
		goto(
			qs ? resolve(`/dashboard/analytics?${qs}` as `/${string}`) : resolve('/dashboard/analytics'),
			{ replaceState: true }
		);
	}

	function clearCustomDates() {
		goto(resolve('/dashboard/analytics'), { replaceState: true });
	}

	// ── Top items toggle ────────────────────────────────────────────
	let topItemsSort = $state<'quantity' | 'revenue'>('quantity');

	const topItemsToShow = $derived(
		topItemsSort === 'revenue' && hasAdvancedAnalytics && topItemsByRevenue
			? topItemsByRevenue
			: topItems
	);

	const maxTopItemValue = $derived(
		topItemsSort === 'revenue'
			? Math.max(...topItemsToShow.map((i) => i.totalRevenue), 1)
			: Math.max(...topItemsToShow.map((i) => i.totalQty), 1)
	);

	function fmt(cents: number) {
		return (
			'$' +
			(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		);
	}

	const totalStatusCount = $derived(statusBreakdown.reduce((s, r) => s + r.count, 0));

	// ── Status filter (client-side recompute for current period) ─────
	const ALL_STATUSES = [
		'received',
		'confirmed',
		'preparing',
		'ready',
		'fulfilled',
		'cancelled'
	] as const;

	const activeStatuses = $state(new SvelteSet<string>(ALL_STATUSES));

	function toggleStatus(status: string) {
		if (activeStatuses.has(status)) activeStatuses.delete(status);
		else activeStatuses.add(status);
	}
	function resetStatuses() {
		activeStatuses.clear();
		for (const s of ALL_STATUSES) activeStatuses.add(s);
	}

	const filterActive = $derived(activeStatuses.size !== ALL_STATUSES.length);

	const filteredDailyData = $derived.by(() => {
		if (!filterActive) return dailyData;
		const map = new SvelteMap<string, { revenue: number; count: number }>();
		for (const d of dailyData) map.set(d.date, { revenue: 0, count: 0 });
		for (const o of recentOrdersForFilter) {
			if (!activeStatuses.has(o.status)) continue;
			const entry = map.get(o.date);
			if (entry) {
				entry.revenue += o.total;
				entry.count += 1;
			}
		}
		return Array.from(map.entries()).map(([date, v]) => ({ date, ...v }));
	});

	const filteredRevenue = $derived(filteredDailyData.reduce((s, d) => s + d.revenue, 0));
	const dataPointsWithRevenue = $derived(filteredDailyData.filter((d) => d.revenue > 0).length);

	// ── Previous-period overlay (hidden when filter active) ──────────
	const showPriorOverlay = $derived(!filterActive && dailyDataPrev.some((d) => d.revenue > 0));

	const dailyPrevByOffset = $derived.by(() => {
		const map = new SvelteMap<number, { revenue: number; count: number }>();
		for (let i = 0; i < dailyDataPrev.length; i++) {
			map.set(i, dailyDataPrev[i]);
		}
		return map;
	});

	// Shared y-scale: both current and prior bars use the same max so the visual
	// comparison is honest. When filter is active, fall back to filtered current only.
	const maxDailyAcrossBoth = $derived(
		filterActive
			? Math.max(...filteredDailyData.map((d) => d.revenue), 1)
			: Math.max(
					...filteredDailyData.map((d) => d.revenue),
					...dailyDataPrev.map((d) => d.revenue),
					1
				)
	);

	const summaryStats = $derived([
		{ label: 'Revenue', value: fmt(kpis.revenue), positive: true },
		{ label: 'Orders', value: kpis.ordersCount },
		{ label: 'Avg order', value: fmt(kpis.avgOrderValue) },
		{
			label: 'Fulfilment rate',
			value: kpis.fulfilledRate !== null ? `${kpis.fulfilledRate}%` : '—',
			sublabel: kpis.fulfilledRate !== null ? 'of paid orders fulfilled' : undefined
		}
	]);

	// Semantic mapping matches StatusBadge's variants used elsewhere on the site.
	// received/confirmed = informational, preparing = active work, ready/fulfilled = success, cancelled = destructive.
	const statusVariant: Record<
		string,
		'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'subtle'
	> = {
		received: 'info',
		confirmed: 'info',
		preparing: 'warning',
		ready: 'success',
		fulfilled: 'success',
		cancelled: 'danger'
	};

	// Deeper shades of the same semantic hues for the stacked bar (StatusBadge's
	// internal palette is too pale to read as bar segments).
	const statusBarColor: Record<string, string> = {
		received: 'bg-blue-300',
		confirmed: 'bg-blue-400',
		preparing: 'bg-amber-400',
		ready: 'bg-success/70',
		fulfilled: 'bg-success',
		cancelled: 'bg-red-300'
	};

	const typeIcons: Record<string, string> = {
		pickup: 'mdi:bag-personal-outline',
		subscription: 'mdi:refresh-circle'
	};

	const typeLabels: Record<string, string> = {
		pickup: 'Pickup',
		subscription: 'Subscription'
	};

	const totalTypeRevenue = $derived(typeBreakdown.reduce((s, r) => s + (r.revenue ?? 0), 0) || 1);
	const maxCategoryRevenue = $derived(
		Math.max(...(revenueByCategory ?? []).map((c) => c.totalRevenue), 1)
	);

	const isUncategorized = $derived(
		(revenueByCategory ?? []).length > 0 &&
			(revenueByCategory ?? [])[0].category === 'Uncategorized'
	);

	// ── Peak hours heatmap ───────────────────────────────────────────
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
	<!-- ── Page header ───────────────────────────────────────────── -->
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
			<p class="mt-0.5 text-sm text-gray-500">
				{#if data.rangeMode === 'custom'}
					{data.fromDate ? formatPickerDate(data.fromDate) : '—'} to {data.toDate
						? formatPickerDate(data.toDate)
						: '—'}
					({rangeDays}
					{rangeDays === 1 ? 'day' : 'days'})
				{:else}
					Last {rangeDays} days vs previous {rangeDays} days
				{/if}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<Tabs
				value={data.rangeMode === 'preset' && data.presetDays ? String(data.presetDays) : ''}
				onValueChange={(v) => {
					if (v === '7' || v === '30' || v === '90') setPreset(Number(v) as 7 | 30 | 90);
				}}
			>
				<TabsList>
					<TabsTrigger value="7">
						<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5" />
						7 days
					</TabsTrigger>
					<TabsTrigger value="30">
						<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5" />
						30 days
					</TabsTrigger>
					<TabsTrigger value="90">
						<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5" />
						90 days
					</TabsTrigger>
				</TabsList>
			</Tabs>

			<div class="flex items-center gap-1.5 rounded-md border px-2.5 py-1">
				<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
				<Popover.Root bind:open={fromOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="text-xs outline-none {data.fromDate
									? 'text-foreground'
									: 'text-muted-foreground'}"
							>
								{data.fromDate ? formatPickerDate(data.fromDate) : 'From'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={fromCalendarValue}
							onValueChange={(date) => {
								fromOpen = false;
								setCustomDate('from', date as CalendarDate | undefined);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<span class="text-muted-foreground/40">→</span>
				<Popover.Root bind:open={toOpen}>
					<Popover.Trigger>
						{#snippet child({ props })}
							<button
								{...props}
								type="button"
								class="text-xs outline-none {data.toDate
									? 'text-foreground'
									: 'text-muted-foreground'}"
							>
								{data.toDate ? formatPickerDate(data.toDate) : 'To'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={toCalendarValue}
							onValueChange={(date) => {
								toOpen = false;
								setCustomDate('to', date as CalendarDate | undefined);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				{#if data.rangeMode === 'custom'}
					<button
						type="button"
						onclick={clearCustomDates}
						class="text-muted-foreground/60 hover:text-foreground"
						aria-label="Clear custom range"
					>
						<Icon icon="mdi:close" class="h-3 w-3" />
					</button>
				{/if}
			</div>

			{#if hasAdvancedAnalytics}
				<Button
					variant="outline"
					class="gap-1.5"
					onclick={() => {
						const qs = new SvelteURLSearchParams();
						if (data.rangeMode === 'custom') {
							if (data.fromDate) qs.set('from', data.fromDate);
							if (data.toDate) qs.set('to', data.toDate);
						} else if (data.presetDays && data.presetDays !== 30) {
							qs.set('range', String(data.presetDays));
						}
						const qsStr = qs.toString();
						window.location.href = qsStr
							? `/dashboard/analytics/export?${qsStr}`
							: '/dashboard/analytics/export';
					}}
				>
					<Icon icon="mdi:download-outline" class="h-3.5 w-3.5" />
					Export
				</Button>
			{/if}
		</div>
	</div>

	<!-- ── KPI summary bar ─────────────────────────────────────── -->
	<OrdersSummaryBar stats={summaryStats} />

	<!-- ── Daily revenue chart ──────────────────────────────────── -->
	<Card class="mb-6 shadow-sm">
		<CardContent>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-semibold text-gray-900">Daily revenue</h2>
					<p class="mt-0.5 text-xs text-gray-400">Last {rangeDays} days</p>
				</div>
				<div class="text-right">
					<p class="text-lg font-semibold text-gray-900">{fmt(filteredRevenue)}</p>
					<p class="text-xs text-gray-400">
						{filterActive
							? `${activeStatuses.size}/${ALL_STATUSES.length} statuses`
							: 'total this period'}
					</p>
				</div>
			</div>

			<!-- Status filter pills -->
			<div class="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
				<span class="text-muted-foreground">Statuses:</span>
				{#each ALL_STATUSES as status (status)}
					{@const active = activeStatuses.has(status)}
					<button
						type="button"
						onclick={() => toggleStatus(status)}
						aria-pressed={active}
						class="rounded-full border px-2 py-0.5 capitalize transition-colors {active
							? `${statusBarColor[status]} border-transparent text-foreground`
							: 'border-border bg-background text-muted-foreground hover:border-foreground/30'}"
					>
						{status}
					</button>
				{/each}
				{#if filterActive}
					<button
						type="button"
						onclick={resetStatuses}
						class="ml-1 text-xs text-muted-foreground hover:text-foreground"
					>
						Reset
					</button>
				{/if}
			</div>

			<div class="flex h-36 items-end gap-px">
				{#each filteredDailyData as day, i (day.date)}
					{@const currentHeight =
						day.revenue === 0
							? 2
							: Math.max(4, Math.round((day.revenue / maxDailyAcrossBoth) * 144))}
					{@const priorRevenue = dailyPrevByOffset.get(i)?.revenue ?? 0}
					{@const priorCount = dailyPrevByOffset.get(i)?.count ?? 0}
					{@const priorHeight =
						priorRevenue === 0
							? 0
							: Math.max(4, Math.round((priorRevenue / maxDailyAcrossBoth) * 144))}
					<div class="group relative flex flex-1 flex-col items-end justify-end">
						{#if showPriorOverlay && priorHeight > 0}
							<div
								class="absolute right-0 bottom-0 w-full rounded-sm bg-muted-foreground/20"
								style="height: {priorHeight}px;"
								aria-hidden="true"
							></div>
						{/if}
						<div
							class="relative w-[70%] rounded-sm bg-primary transition-colors group-hover:bg-primary/80"
							style="height: {currentHeight}px;"
						></div>
						{#if day.revenue > 0 || (showPriorOverlay && priorRevenue > 0)}
							<div
								class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
							>
								<div
									class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
								>
									<p class="font-medium">{fmt(day.revenue)}</p>
									<p class="text-muted-foreground">
										{day.count}
										{day.count === 1 ? 'order' : 'orders'}
									</p>
									{#if showPriorOverlay && priorRevenue > 0}
										<div class="mt-1 border-t border-white/10 pt-1">
											<p class="text-muted-foreground">
												Prior: {fmt(priorRevenue)} ({priorCount}
												{priorCount === 1 ? 'order' : 'orders'})
											</p>
										</div>
									{/if}
								</div>
								<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-1.5 flex justify-between text-xs text-muted-foreground">
				<span>{filteredDailyData[0]?.date.slice(5)}</span>
				<span>{filteredDailyData[Math.floor(filteredDailyData.length / 2)]?.date.slice(5)}</span>
				<span>{filteredDailyData[filteredDailyData.length - 1]?.date.slice(5)}</span>
			</div>
			{#if showPriorOverlay}
				<div class="mt-2 flex items-center justify-end gap-3 text-xs text-muted-foreground">
					<span class="flex items-center gap-1.5">
						<span class="inline-block h-2 w-2 rounded-sm bg-primary"></span>
						Current
					</span>
					<span class="flex items-center gap-1.5">
						<span class="inline-block h-2 w-2 rounded-sm bg-muted-foreground/40"></span>
						Previous period
					</span>
				</div>
			{/if}
			{#if dataPointsWithRevenue < 5}
				<p class="mt-2 text-center text-xs text-gray-400">
					Not enough data yet — charts fill in as more orders come through.
				</p>
			{/if}
		</CardContent>
	</Card>

	<!-- ── Bottom grid ───────────────────────────────────────────── -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Top items -->
		<Card class="self-start shadow-sm lg:col-span-2">
			<CardContent>
				<div class="mb-4 flex items-center justify-between gap-3">
					<h2 class="text-sm font-semibold text-gray-900">Top items</h2>
					{#if hasAdvancedAnalytics}
						<Tabs
							value={topItemsSort}
							onValueChange={(v) => (topItemsSort = v as 'quantity' | 'revenue')}
						>
							<TabsList>
								<TabsTrigger value="quantity">By quantity</TabsTrigger>
								<TabsTrigger value="revenue">By revenue</TabsTrigger>
							</TabsList>
						</Tabs>
					{/if}
				</div>
				{#if topItemsToShow.length === 0}
					<p class="text-sm text-muted-foreground">No order data yet.</p>
				{:else}
					<div class="space-y-3">
						{#each topItemsToShow as item, i (item.name)}
							<div>
								<div class="mb-1 flex items-center justify-between gap-2">
									<div class="flex min-w-0 items-center gap-2">
										<span class="w-4 shrink-0 text-xs font-bold text-muted-foreground"
											>#{i + 1}</span
										>
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
										style="width: {Math.round(
											(topItemsSort === 'revenue'
												? item.totalRevenue / maxTopItemValue
												: item.totalQty / maxTopItemValue) * 100
										)}%"
									></div>
								</div>
							</div>
						{/each}
					</div>
					{#if topItemsToShow.length < 5}
						<p class="mt-3 text-xs text-gray-400">
							Only {topItemsToShow.length}
							{topItemsToShow.length === 1 ? 'item' : 'items'} ordered this period
						</p>
					{/if}
					<div class="mt-3 border-t border-gray-100 pt-3">
						<a
							href={resolve('/dashboard/catalog/items')}
							class="text-sm text-success hover:underline"
						>
							View all catalog items →
						</a>
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
					<h2 class="mb-3 text-sm font-semibold text-foreground">
						Orders by status — last {rangeDays} days
					</h2>
					{#if statusBreakdown.length === 0}
						<p class="text-sm text-muted-foreground">No data yet.</p>
					{:else}
						<div class="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-muted">
							{#each statusBreakdown as row (row.status)}
								{@const widthPct = (row.count / totalStatusCount) * 100}
								<div
									class="group relative {statusBarColor[row.status] ??
										'bg-muted'} transition-all hover:opacity-80"
									style="width: {widthPct}%"
								>
									<div
										class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
									>
										<div
											class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
										>
											<p class="font-medium capitalize">{row.status}</p>
											<p class="text-muted-foreground">
												{row.count}
												{row.count === 1 ? 'order' : 'orders'} ({widthPct.toFixed(1)}%)
											</p>
										</div>
										<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
									</div>
								</div>
							{/each}
						</div>
						<div class="space-y-1.5">
							{#each statusBreakdown as row (row.status)}
								<div class="flex items-center justify-between text-xs">
									<StatusBadge variant={statusVariant[row.status] ?? 'subtle'} class="capitalize">
										{row.status}
									</StatusBadge>
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
			<!-- Advanced Analytics section divider -->
			<div class="my-6 flex items-center gap-3">
				<div class="flex-1 border-t border-gray-200"></div>
				<div
					class="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5"
				>
					<Icon icon="mdi:star" class="h-3.5 w-3.5 text-amber-500" />
					<span class="text-xs font-semibold text-amber-700">Advanced Analytics</span>
				</div>
				<div class="flex-1 border-t border-gray-200"></div>
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
															<div
																class="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
															>
																<div class="-mb-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
																<div
																	class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
																>
																	<p>{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-muted-foreground">
																		{cell.count}
																		{cell.count === 1 ? 'order' : 'orders'}
																	</p>
																</div>
															</div>
														{:else}
															<!-- bottom rows: tooltip above -->
															<div
																class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
															>
																<div
																	class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
																>
																	<p>{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-muted-foreground">
																		{cell.count}
																		{cell.count === 1 ? 'order' : 'orders'}
																	</p>
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
								<div
									class="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground"
								>
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

			<!-- Customer retention + Revenue by category -->
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
									<div class="mb-1 flex items-end gap-2">
										<p class="text-3xl font-bold text-gray-900">{customerRetention.returnRate}%</p>
										<p class="mb-1 text-sm text-gray-500">return rate</p>
									</div>
									<p class="text-xs text-gray-400">
										Based on {customerRetention.total} customers identified by email
									</p>
								</div>

								<!-- Bar visualization -->
								<div class="space-y-3">
									<div>
										<div class="mb-1 flex items-center justify-between text-xs">
											<span class="text-muted-foreground">Returning</span>
											<span class="font-medium text-foreground">{customerRetention.returning}</span>
										</div>
										<div class="h-1.5 w-full rounded-full bg-muted">
											<div
												class="h-1.5 rounded-full bg-success transition-all"
												style="width: {customerRetention.returnRate}%"
											></div>
										</div>
									</div>
									<div>
										<div class="mb-1 flex items-center justify-between text-xs">
											<span class="text-muted-foreground">First-time</span>
											<span class="font-medium text-foreground"
												>{customerRetention.total - customerRetention.returning}</span
											>
										</div>
										<div class="h-1.5 w-full rounded-full bg-muted">
											<div
												class="h-1.5 rounded-full bg-gray-400 transition-all"
												style="width: {100 - customerRetention.returnRate}%"
											></div>
										</div>
									</div>
								</div>
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
							{#if isUncategorized}
								<div
									class="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700"
								>
									<Icon icon="mdi:alert-outline" class="mt-0.5 h-4 w-4 shrink-0" />
									<span>
										Your catalog items aren't assigned to categories yet.
										<a
											href={resolve('/dashboard/catalog/categories')}
											class="font-medium underline"
										>
											Set up categories
										</a>
										to see revenue broken down by section.
									</span>
								</div>
							{/if}
							<div class="space-y-3">
								{#each revenueByCategory as cat (cat.category)}
									<div>
										<div class="mb-1 flex items-center justify-between gap-2">
											<span class="truncate text-sm font-medium text-foreground"
												>{cat.category}</span
											>
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
							{#each [{ icon: 'mdi:clock-outline', label: 'Peak hours heatmap — find your busiest day/time combinations' }, { icon: 'mdi:account-group-outline', label: 'Customer retention — new vs. returning, return rate over time' }, { icon: 'mdi:trophy-outline', label: 'Top items by revenue vs. volume — they rank differently' }] as feat (feat.label)}
								<li class="flex items-start gap-2.5 text-sm text-muted-foreground">
									<Icon icon={feat.icon} class="mt-0.5 h-4 w-4 shrink-0 text-primary/70" />
									{feat.label}
								</li>
							{/each}
						</ul>
						<Button href={resolve('/dashboard/account/billing')} class="gap-2">
							<Icon icon="mdi:arrow-up-circle-outline" class="h-4 w-4" />
							Unlock for ${analyticsAddon?.price ?? 29}/mo
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	{/if}
</div>
