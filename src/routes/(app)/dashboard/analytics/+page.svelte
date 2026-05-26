<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Card, CardContent } from '$lib/components/ui/card';
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
		topItemsPrev,
		statusBreakdown,
		typeBreakdown,
		hasAdvancedAnalytics,
		peakHoursGrid,
		customerRetention,
		revenueByCategory,
		topItemsByRevenue,
		busiestWindow,
		leadTime,
		cancellationTrend
	} = $derived(data);

	// ── Range controls state ────────────────────────────────────────
	let fromOpen = $state(false);
	let toOpen = $state(false);

	// Draft date state — the user's tentative pick, applied only via the Apply button.
	let draftFromDate = $state<string | null>(null);
	let draftToDate = $state<string | null>(null);

	// Keep draft synced with applied state (e.g. after a preset switch or clear).
	$effect(() => {
		draftFromDate = data.fromDate;
		draftToDate = data.toDate;
	});

	const draftFromCalendarValue = $derived(draftFromDate ? parseDate(draftFromDate) : undefined);
	const draftToCalendarValue = $derived(draftToDate ? parseDate(draftToDate) : undefined);

	const canApplyDraft = $derived(
		draftFromDate !== null &&
			draftToDate !== null &&
			draftFromDate <= draftToDate &&
			(draftFromDate !== data.fromDate || draftToDate !== data.toDate)
	);

	function formatPickerDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function rangeLabel(d: typeof data): string {
		if (d.rangeMode === 'custom' && d.fromDate && d.toDate) {
			return `${formatPickerDate(d.fromDate)} → ${formatPickerDate(d.toDate)}`;
		}
		const days = d.rangeDays;
		return `Last ${days} ${days === 1 ? 'day' : 'days'}`;
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

	function setDraftDate(which: 'from' | 'to', date: CalendarDate | undefined) {
		const dateStr = date?.toString() ?? null;
		if (which === 'from') draftFromDate = dateStr;
		else draftToDate = dateStr;
	}

	function applyDraftDates() {
		if (!canApplyDraft) return;
		const p = new SvelteURLSearchParams();
		if (draftFromDate) p.set('from', draftFromDate);
		if (draftToDate) p.set('to', draftToDate);
		const qs = p.toString();
		goto(
			qs ? resolve(`/dashboard/analytics?${qs}` as `/${string}`) : resolve('/dashboard/analytics'),
			{ replaceState: true }
		);
	}

	function clearCustomDates() {
		draftFromDate = null;
		draftToDate = null;
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

	function topItemDelta(item: {
		name: string;
		totalQty: number;
		totalRevenue: number;
	}): { kind: 'pct'; value: number } | { kind: 'new' } | { kind: 'none' } {
		const prior = topItemsPrev.find((p) => p.name === item.name);
		const currentMetric = topItemsSort === 'revenue' ? item.totalRevenue : item.totalQty;
		const priorMetric = prior
			? topItemsSort === 'revenue'
				? prior.totalRevenue
				: prior.totalQty
			: 0;

		if (priorMetric === 0 && currentMetric > 0) return { kind: 'new' };
		if (priorMetric === 0) return { kind: 'none' };
		const pct = ((currentMetric - priorMetric) / priorMetric) * 100;
		return { kind: 'pct', value: pct };
	}

	function fmt(cents: number) {
		return (
			'$' +
			(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		);
	}

	function formatTooltipDate(dateStr: string): string {
		const [y, m, d] = dateStr.split('-').map(Number);
		const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}

	function formatXAxisLabel(dateStr: string): string {
		const [, m, d] = dateStr.split('-');
		return `${Number(m)}/${Number(d)}`;
	}

	function formatLeadTime(seconds: number): string {
		const hours = seconds / 3600;
		const days = hours / 24;
		if (days >= 2) return `${days.toFixed(1)} days`;
		if (hours >= 2) return `${hours.toFixed(1)} hours`;
		const minutes = seconds / 60;
		if (minutes >= 2) return `${Math.round(minutes)} min`;
		return `${Math.round(seconds)} sec`;
	}

	function getBarAriaLabel(day: StackedDay): string {
		if (day.totalCount === 0) {
			return `${formatTooltipDate(day.date)}: no orders`;
		}
		const totalStr =
			chartMode === 'revenue'
				? `${fmt(day.totalRevenue)} in ${day.totalCount} ${day.totalCount === 1 ? 'order' : 'orders'}`
				: `${day.totalCount} ${day.totalCount === 1 ? 'order' : 'orders'} (${fmt(day.totalRevenue)})`;
		return `${formatTooltipDate(day.date)}: ${totalStr}`;
	}

	// ── Status filter (client-side recompute for current period) ─────
	const ALL_STATUSES = [
		'received',
		'confirmed',
		'preparing',
		'ready',
		'fulfilled',
		'cancelled'
	] as const;

	// Default filter state: all statuses except cancelled.
	const DEFAULT_STATUSES = new Set<string>([
		'received',
		'confirmed',
		'preparing',
		'ready',
		'fulfilled'
	]);

	// Stack order (bottom → top): cool-to-warm. Cancelled sits visually on top.
	const STACK_ORDER = [
		'received',
		'confirmed',
		'preparing',
		'ready',
		'fulfilled',
		'cancelled'
	] as const;

	const activeStatuses = $state(new SvelteSet<string>(DEFAULT_STATUSES));

	const isDefaultState = $derived.by(() => {
		if (activeStatuses.size !== DEFAULT_STATUSES.size) return false;
		for (const s of DEFAULT_STATUSES) if (!activeStatuses.has(s)) return false;
		return true;
	});

	const isolatedStatus = $derived.by(() => {
		if (activeStatuses.size !== 1) return null;
		return [...activeStatuses][0];
	});

	const filterActive = $derived(!isDefaultState);

	function clickPill(status: string) {
		if (isolatedStatus === status) {
			activeStatuses.clear();
			for (const s of DEFAULT_STATUSES) activeStatuses.add(s);
			return;
		}
		if (isDefaultState) {
			activeStatuses.clear();
			activeStatuses.add(status);
			return;
		}
		if (activeStatuses.has(status)) {
			activeStatuses.delete(status);
		} else {
			activeStatuses.add(status);
		}
	}

	function resetStatuses() {
		activeStatuses.clear();
		for (const s of DEFAULT_STATUSES) activeStatuses.add(s);
	}

	// Toggle: revenue vs count
	let chartMode = $state<'revenue' | 'count'>('revenue');

	// Per-day per-status aggregation built from recentOrdersForFilter.
	type StackSegment = { status: string; revenue: number; count: number };
	type StackedDay = {
		date: string;
		segments: StackSegment[];
		totalRevenue: number;
		totalCount: number;
	};

	const stackedDaily = $derived.by<StackedDay[]>(() => {
		const dateOrder: string[] = dailyData.map((d) => d.date);
		const map = new SvelteMap<string, SvelteMap<string, { revenue: number; count: number }>>();
		for (const d of dailyData) {
			const inner = new SvelteMap<string, { revenue: number; count: number }>();
			for (const s of STACK_ORDER) inner.set(s, { revenue: 0, count: 0 });
			map.set(d.date, inner);
		}

		for (const o of recentOrdersForFilter) {
			if (!activeStatuses.has(o.status)) continue;
			const day = map.get(o.date);
			if (!day) continue;
			const seg = day.get(o.status);
			if (!seg) continue;
			seg.revenue += o.total;
			seg.count += 1;
		}

		return dateOrder.map((date) => {
			const inner = map.get(date)!;
			const segments: StackSegment[] = STACK_ORDER.map((status) => ({
				status,
				...inner.get(status)!
			})).filter((s) => s.revenue > 0 || s.count > 0);
			const totalRevenue = segments.reduce((s, x) => s + x.revenue, 0);
			const totalCount = segments.reduce((s, x) => s + x.count, 0);
			return { date, segments, totalRevenue, totalCount };
		});
	});

	const filteredRevenue = $derived(stackedDaily.reduce((s, d) => s + d.totalRevenue, 0));
	const filteredCount = $derived(stackedDaily.reduce((s, d) => s + d.totalCount, 0));
	const dataPointsWithRevenue = $derived(stackedDaily.filter((d) => d.totalRevenue > 0).length);

	const maxDailyValue = $derived(
		Math.max(
			...stackedDaily.map((d) => (chartMode === 'revenue' ? d.totalRevenue : d.totalCount)),
			...stackedDaily.map((_, i) => {
				if (!showPriorOverlay) return 0;
				const prior = dailyPrevByOffset.get(i);
				if (!prior) return 0;
				return chartMode === 'revenue' ? prior.revenue : prior.count;
			}),
			1
		)
	);

	// Y-axis tick values (0 / mid / max), with "nice" rounding for display.
	const yTicks = $derived.by(() => {
		const max = maxDailyValue;
		const niceMax = chartMode === 'revenue' ? Math.ceil(max / 100) * 100 : Math.ceil(max);
		const niceMid = Math.round(niceMax / 2);
		return { zero: 0, mid: niceMid, max: niceMax };
	});

	// Adaptive x-axis label density.
	const labelStride = $derived.by(() => {
		const n = stackedDaily.length;
		if (n <= 14) return 1;
		if (n <= 45) return 3;
		return 7;
	});

	// ── Previous-period overlay (hidden when filter active) ──────────
	const showPriorOverlay = $derived(!filterActive && dailyDataPrev.some((d) => d.revenue > 0));

	const dailyPrevByOffset = $derived.by(() => {
		const map = new SvelteMap<number, { revenue: number; count: number }>();
		for (let i = 0; i < dailyDataPrev.length; i++) {
			map.set(i, dailyDataPrev[i]);
		}
		return map;
	});

	const summaryStats = $derived([
		{ label: 'Revenue', value: fmt(kpis.revenue), positive: true },
		{ label: 'Orders', value: kpis.ordersCount },
		{
			label: 'Items',
			value: kpis.itemsProduced.toLocaleString(),
			sublabel:
				kpis.itemsProducedChange !== null
					? `${kpis.itemsProducedChange >= 0 ? '+' : ''}${kpis.itemsProducedChange.toFixed(0)}% vs prev`
					: undefined
		},
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
		ready: 'bg-green-300',
		fulfilled: 'bg-green-600',
		cancelled: 'bg-red-300'
	};

	const statusLabel: Record<string, string> = {
		received: 'Received',
		confirmed: 'Confirmed',
		preparing: 'Preparing',
		ready: 'Ready',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled',
		scheduled: 'Scheduled',
		pending_approval: 'Pending approval',
		payment_failed: 'Payment failed'
	};

	const typeIcons: Record<string, string> = {
		pickup: 'mdi:bag-personal-outline',
		subscription: 'mdi:refresh-circle',
		special_order: 'mdi:clipboard-edit-outline'
	};

	const typeLabels: Record<string, string> = {
		pickup: 'Pickup',
		subscription: 'Subscription',
		special_order: 'Special order'
	};

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
	// Per-week framing for heatmap tooltips. Derived from the active range — heatmap
	// is no longer hardcoded to 90 days.
	const heatmapWeeks = $derived(Math.max(1, Math.round(data.rangeDays / 7)));

	const heatmapLookup = $derived.by(() => {
		const map = new SvelteMap<string, { count: number; revenue: number }>();
		for (const row of peakHoursGrid ?? []) {
			map.set(`${row.dow}-${row.hour}`, { count: row.count, revenue: row.revenue });
		}
		return map;
	});

	const maxHeatmapCount = $derived(Math.max(...(peakHoursGrid ?? []).map((r) => r.count), 1));

	function heatmapCell(
		dow: number,
		hour: number
	): { count: number; revenue: number; opacity: number } {
		const entry = heatmapLookup.get(`${dow}-${hour}`);
		const count = entry?.count ?? 0;
		const revenue = entry?.revenue ?? 0;
		const opacity = count === 0 ? 0 : Math.max(0.08, count / maxHeatmapCount);
		return { count, revenue, opacity };
	}

	function fmtHour(h: number): string {
		if (h === 0) return '12a';
		if (h === 12) return '12p';
		return h < 12 ? `${h}a` : `${h - 12}p`;
	}

	function perWeekRate(count: number): string {
		const rate = count / heatmapWeeks;
		if (rate < 0.1) return '<0.1';
		if (rate < 1) return rate.toFixed(1);
		return Math.round(rate).toString();
	}

	function cellAriaLabel(
		dow: number,
		hour: number,
		cell: { count: number; revenue: number },
		di: number
	): string {
		if (cell.count === 0) return `${DOW_LABELS[di]} ${fmtHour(hour)}: no orders`;
		const rate = perWeekRate(cell.count);
		const rev = cell.revenue > 0 ? `, ${fmt(cell.revenue)}` : '';
		return `${DOW_LABELS[di]} ${fmtHour(hour)}: ${cell.count} ${
			cell.count === 1 ? 'order' : 'orders'
		} (about ${rate} per week)${rev}`;
	}

	const peakCell = $derived.by<{
		dow: number;
		hour: number;
		count: number;
		revenue: number;
	} | null>(() => {
		if (!peakHoursGrid || peakHoursGrid.length === 0) return null;
		let max = peakHoursGrid[0];
		for (const row of peakHoursGrid) {
			if (row.count > max.count) max = row;
		}
		return max;
	});

	const peakCellLabel = $derived.by(() => {
		if (!peakCell) return null;
		const dowIdx = DOW_ORDER.indexOf(peakCell.dow);
		if (dowIdx < 0) return null;
		return `${DOW_LABELS[dowIdx]} ${fmtHour(peakCell.hour)}`;
	});

	const legendBuckets = $derived.by<Array<{ label: string; opacity: number }>>(() => {
		const max = maxHeatmapCount;
		if (max <= 1) return [{ label: '1', opacity: 1 }];
		const step = Math.max(1, Math.ceil(max / 5));
		const buckets: Array<{ label: string; opacity: number }> = [];
		for (let i = 0; i < 5; i++) {
			const low = i * step + 1;
			const high = Math.min(max, (i + 1) * step);
			if (low > max) break;
			const label = low === high ? `${low}` : `${low}–${high}`;
			const opacity = Math.max(0.08, (i + 1) / 5);
			buckets.push({ label, opacity });
			if (high >= max) break;
		}
		return buckets;
	});
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
								class="text-xs outline-none {draftFromDate
									? 'text-foreground'
									: 'text-muted-foreground'}"
							>
								{draftFromDate ? formatPickerDate(draftFromDate) : 'From'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={draftFromCalendarValue}
							onValueChange={(date) => {
								fromOpen = false;
								setDraftDate('from', date as CalendarDate | undefined);
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
								class="text-xs outline-none {draftToDate
									? 'text-foreground'
									: 'text-muted-foreground'}"
							>
								{draftToDate ? formatPickerDate(draftToDate) : 'To'}
							</button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content class="w-auto p-0" align="start">
						<Calendar
							type="single"
							value={draftToCalendarValue}
							onValueChange={(date) => {
								toOpen = false;
								setDraftDate('to', date as CalendarDate | undefined);
							}}
						/>
					</Popover.Content>
				</Popover.Root>
				<button
					type="button"
					onclick={applyDraftDates}
					disabled={!canApplyDraft}
					class="ml-1 rounded px-2 py-0.5 text-xs font-medium transition-colors {canApplyDraft
						? 'bg-foreground text-background hover:bg-foreground/90'
						: 'cursor-not-allowed bg-muted text-muted-foreground'}"
				>
					Apply
				</button>
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
	<Card class="mb-6 overflow-visible shadow-sm">
		<CardContent>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-semibold text-gray-900">Daily revenue</h2>
					<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
				</div>
				<div class="text-right">
					<p class="text-lg font-semibold text-gray-900">
						{chartMode === 'revenue' ? fmt(filteredRevenue) : filteredCount.toLocaleString()}
					</p>
					<p class="text-xs text-gray-400">
						{#if isDefaultState}
							{chartMode === 'revenue' ? 'total this period' : 'orders this period'}
						{:else if isolatedStatus}
							{isolatedStatus} only
						{:else}
							{activeStatuses.size}/{ALL_STATUSES.length} statuses
						{/if}
					</p>
				</div>
			</div>

			<!-- Chart with y-axis + gridlines + stacked bars -->
			<div class="relative">
				<!-- Y-axis labels (3 ticks: max / mid / 0) -->
				<div
					class="pointer-events-none absolute top-0 left-0 flex h-36 w-10 flex-col justify-between text-right text-[10px] text-muted-foreground"
				>
					<span>{chartMode === 'revenue' ? fmt(yTicks.max) : yTicks.max}</span>
					<span>{chartMode === 'revenue' ? fmt(yTicks.mid) : yTicks.mid}</span>
					<span>0</span>
				</div>

				<!-- Horizontal gridlines (dashed, behind bars) -->
				<div
					class="pointer-events-none absolute top-0 right-0 left-12 flex h-36 flex-col justify-between"
				>
					<div class="border-t border-dashed border-muted/40"></div>
					<div class="border-t border-dashed border-muted/40"></div>
					<div class="border-t border-dashed border-muted/40"></div>
				</div>

				<!-- Bars container (offset by y-axis width) -->
				<div class="ml-12 flex h-36 items-end gap-px">
					{#each stackedDaily as day, i (day.date)}
						{@const total = chartMode === 'revenue' ? day.totalRevenue : day.totalCount}
						{@const totalHeight =
							total === 0 ? 2 : Math.max(4, Math.round((total / maxDailyValue) * 144))}
						{@const priorRevenue = dailyPrevByOffset.get(i)?.revenue ?? 0}
						{@const priorCount = dailyPrevByOffset.get(i)?.count ?? 0}
						{@const priorTotal = chartMode === 'revenue' ? priorRevenue : priorCount}
						{@const priorHeight =
							priorTotal === 0 ? 0 : Math.max(4, Math.round((priorTotal / maxDailyValue) * 144))}

						<div
							class="group relative flex flex-1 flex-col items-end justify-end focus-within:outline-none"
							tabindex="0"
							role="button"
							aria-label={getBarAriaLabel(day)}
						>
							<!-- Prior period bar (flat gray, full width, behind) -->
							{#if showPriorOverlay && priorHeight > 0}
								<div
									class="absolute right-0 bottom-0 w-full rounded-sm bg-muted-foreground/20"
									style="height: {priorHeight}px;"
									aria-hidden="true"
								></div>
							{/if}

							<!-- Current bar: stack of segments, 70% width, bottom-to-top -->
							{#if total > 0}
								<div
									class="relative flex w-[70%] flex-col-reverse justify-end"
									style="height: {totalHeight}px;"
								>
									{#each day.segments as seg (seg.status)}
										{@const segValue = chartMode === 'revenue' ? seg.revenue : seg.count}
										{@const segHeight = Math.max(1, Math.round((segValue / total) * totalHeight))}
										<div
											class="{statusBarColor[seg.status]} transition-colors group-hover:opacity-90"
											style="height: {segHeight}px;"
										></div>
									{/each}
								</div>
							{:else}
								<!-- Empty day: 2px sliver baseline -->
								<div class="w-[70%] rounded-sm bg-muted/30" style="height: 2px;"></div>
							{/if}

							<!-- Tooltip -->
							{#if total > 0 || (showPriorOverlay && priorTotal > 0)}
								<div
									class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-focus-within:flex group-hover:flex"
								>
									<div
										class="rounded-md bg-gray-900 px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
									>
										<p class="mb-1 font-semibold">{formatTooltipDate(day.date)}</p>
										{#if total > 0}
											<div class="space-y-0.5 border-t border-white/15 pt-1.5">
												{#each day.segments as seg (seg.status)}
													<div class="flex items-center gap-1.5">
														<span
															class="inline-block h-2 w-2 rounded-sm {statusBarColor[seg.status]}"
														></span>
														<span class="capitalize">{seg.status}</span>
														<span class="ml-auto pl-2 font-medium">
															{chartMode === 'revenue' ? fmt(seg.revenue) : seg.count}
														</span>
													</div>
												{/each}
											</div>
											<div
												class="mt-1.5 flex items-center gap-3 border-t border-white/15 pt-1.5 font-medium"
											>
												<span>Total</span>
												<span class="ml-auto">
													{#if chartMode === 'revenue'}
														{fmt(day.totalRevenue)} ({day.totalCount}
														{day.totalCount === 1 ? 'order' : 'orders'})
													{:else}
														{day.totalCount}
														{day.totalCount === 1 ? 'order' : 'orders'} ({fmt(day.totalRevenue)})
													{/if}
												</span>
											</div>
										{:else}
											<p class="text-muted-foreground">No orders</p>
										{/if}
										{#if showPriorOverlay && priorTotal > 0}
											<div
												class="mt-1.5 flex items-center gap-3 border-t border-white/15 pt-1.5 text-muted-foreground"
											>
												<span>Prior:</span>
												<span class="ml-auto">
													{#if chartMode === 'revenue'}
														{fmt(priorRevenue)} ({priorCount}
														{priorCount === 1 ? 'order' : 'orders'})
													{:else}
														{priorCount}
														{priorCount === 1 ? 'order' : 'orders'} ({fmt(priorRevenue)})
													{/if}
												</span>
											</div>
										{/if}
									</div>
									<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- Adaptive x-axis labels -->
			<div class="mt-1.5 ml-12 flex gap-px">
				{#each stackedDaily as day, i (day.date)}
					<div class="flex-1 text-center text-[10px] text-muted-foreground">
						{i % labelStride === 0 || i === stackedDaily.length - 1
							? formatXAxisLabel(day.date)
							: ''}
					</div>
				{/each}
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

			<!-- Chart controls: toggle + status pills + reset -->
			<div class="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
				<div class="flex items-center gap-1 rounded-md border bg-background p-0.5">
					<button
						type="button"
						onclick={() => (chartMode = 'revenue')}
						class="rounded px-2 py-0.5 text-xs transition-colors {chartMode === 'revenue'
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:text-foreground'}"
						aria-pressed={chartMode === 'revenue'}
					>
						$ Revenue
					</button>
					<button
						type="button"
						onclick={() => (chartMode = 'count')}
						class="rounded px-2 py-0.5 text-xs transition-colors {chartMode === 'count'
							? 'bg-foreground text-background'
							: 'text-muted-foreground hover:text-foreground'}"
						aria-pressed={chartMode === 'count'}
					>
						# Orders
					</button>
				</div>

				<div class="flex flex-wrap items-center gap-1.5 md:ml-2">
					{#each ALL_STATUSES as status (status)}
						{@const active = activeStatuses.has(status)}
						<button
							type="button"
							onclick={() => clickPill(status)}
							aria-pressed={active}
							class="rounded-full border px-2 py-0.5 text-xs capitalize transition-colors {active
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
			</div>

			{#if dataPointsWithRevenue < 5}
				<p class="mt-2 text-center text-xs text-gray-400">
					Not enough data yet — charts fill in as more orders come through.
				</p>
			{/if}
		</CardContent>
	</Card>

	<!-- ── Bottom grid ───────────────────────────────────────────── -->
	<div class="mb-6 grid gap-6 lg:grid-cols-3">
		<!-- Top items -->
		<Card class="self-start shadow-sm lg:col-span-2">
			<CardContent>
				<div class="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 class="text-sm font-semibold text-gray-900">Top items</h2>
						<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
					</div>
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
							{@const delta = topItemDelta(item)}
							<div>
								<div class="mb-1 flex items-center justify-between gap-2">
									<div class="flex min-w-0 items-center gap-2">
										<span class="w-4 shrink-0 text-xs font-bold text-muted-foreground"
											>#{i + 1}</span
										>
										<span class="truncate text-sm font-medium text-foreground">{item.name}</span>
									</div>
									<div class="flex shrink-0 flex-col items-end gap-0.5">
										<div class="flex items-center gap-3 text-xs text-muted-foreground">
											<span>{item.totalQty} sold</span>
											<span class="font-medium text-muted-foreground">{fmt(item.totalRevenue)}</span
											>
										</div>
										{#if delta.kind === 'pct'}
											<span
												class="text-[11px] font-medium {delta.value >= 0
													? 'text-emerald-600'
													: 'text-red-500'}"
											>
												{delta.value >= 0 ? '+' : ''}{delta.value.toFixed(0)}% vs prev
											</span>
										{:else if delta.kind === 'new'}
											<span class="text-[11px] font-medium text-emerald-600">New this period</span>
										{/if}
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
			<!-- Order breakdown (status + type) -->
			<Card class="shadow-sm">
				<CardContent>
					<div class="mb-4">
						<h2 class="text-sm font-semibold text-gray-900">Order breakdown</h2>
						<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
					</div>

					{#if statusBreakdown.length === 0 && typeBreakdown.length === 0}
						<p class="mt-3 text-sm text-muted-foreground">No data yet.</p>
					{:else}
						<!-- By status -->
						{#if statusBreakdown.length > 0}
							<div class="mt-4">
								<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									By status
								</p>
								<div class="space-y-1.5">
									{#each statusBreakdown as row (row.status)}
										<div class="flex items-center justify-between text-xs">
											<StatusBadge variant={statusVariant[row.status] ?? 'subtle'}>
												{statusLabel[row.status] ?? row.status}
											</StatusBadge>
											<span class="font-medium text-muted-foreground">{row.count}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Divider between subsections (only when both have data) -->
						{#if statusBreakdown.length > 0 && typeBreakdown.length > 0}
							<div class="my-4 border-t border-border/60"></div>
						{/if}

						<!-- By type -->
						{#if typeBreakdown.length > 0}
							<div>
								<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									By type
								</p>
								<div class="space-y-1.5">
									{#each typeBreakdown as row (row.type)}
										<div class="flex items-center justify-between text-xs">
											<span class="inline-flex items-center gap-1.5 text-foreground">
												<Icon
													icon={typeIcons[row.type] ?? 'mdi:food'}
													class="h-3.5 w-3.5 text-muted-foreground"
												/>
												{typeLabels[row.type] ?? row.type}
											</span>
											<span class="flex items-center gap-3 text-muted-foreground">
												<span>{row.count} {row.count === 1 ? 'order' : 'orders'}</span>
												<span class="font-medium">{fmt(row.revenue ?? 0)}</span>
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
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
			<Card class="mb-6 overflow-visible shadow-sm">
				<CardContent>
					<div class="mb-4">
						<h2 class="text-sm font-semibold text-gray-900">Peak hours</h2>
						<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
					</div>
					{#if (peakHoursGrid ?? []).length === 0}
						<p class="text-sm text-muted-foreground">Not enough order data yet.</p>
					{:else}
						{#if peakCell && peakCellLabel}
							<div
								class="mb-3 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-muted-foreground"
							>
								<span
									>Peak: <strong class="font-semibold text-emerald-600">{peakCellLabel}</strong
									></span
								>
								<span class="text-muted-foreground/60">·</span>
								<span
									>{peakCell.count}
									{peakCell.count === 1 ? 'order' : 'orders'}</span
								>
								{#if peakCell.revenue > 0}
									<span class="text-muted-foreground/60">·</span>
									<span>{fmt(peakCell.revenue)}</span>
								{/if}
							</div>
						{/if}

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
										<div
											class="sticky left-0 z-10 w-10 shrink-0 bg-card pr-1 text-right text-[10px] text-muted-foreground"
										>
											{DOW_LABELS[di]}
										</div>
										<div class="flex flex-1 gap-0.5">
											{#each HOURS as h (h)}
												{@const cell = heatmapCell(dow, h)}
												{@const isSixHourMark = h > 0 && h % 6 === 0}
												{@const ariaLabel = cellAriaLabel(dow, h, cell, di)}
												<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
												<div
													class="group relative flex-1 focus-within:outline-none"
													tabindex={cell.count > 0 ? 0 : -1}
													role={cell.count > 0 ? 'button' : undefined}
													aria-label={ariaLabel}
												>
													<div
														class="h-5 w-full rounded-sm {cell.count === 0
															? 'bg-muted/30'
															: ''} {isSixHourMark
															? 'border-l border-muted-foreground/15'
															: ''} {di === 5 ? 'border-t border-muted-foreground/15' : ''}"
														style={cell.count > 0
															? `background-color: oklch(0.612 0.17 152.75 / ${cell.opacity});`
															: ''}
													></div>
													{#if cell.count > 0}
														{#if di < 3}
															<!-- top rows: tooltip below to avoid clipping -->
															<div
																class="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 hidden -translate-x-1/2 flex-col items-center group-focus-within:flex group-hover:flex"
															>
																<div class="-mb-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
																<div
																	class="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
																>
																	<p class="font-semibold">{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-gray-300">
																		{cell.count}
																		{cell.count === 1 ? 'order' : 'orders'}
																		<span class="text-gray-400"
																			>(~{perWeekRate(cell.count)}/wk)</span
																		>
																	</p>
																	{#if cell.revenue > 0}
																		<p class="text-gray-300">{fmt(cell.revenue)}</p>
																	{/if}
																</div>
															</div>
														{:else}
															<!-- bottom rows: tooltip above -->
															<div
																class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-focus-within:flex group-hover:flex"
															>
																<div
																	class="rounded-md bg-gray-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg"
																>
																	<p class="font-semibold">{DOW_LABELS[di]} {fmtHour(h)}</p>
																	<p class="text-gray-300">
																		{cell.count}
																		{cell.count === 1 ? 'order' : 'orders'}
																		<span class="text-gray-400"
																			>(~{perWeekRate(cell.count)}/wk)</span
																		>
																	</p>
																	{#if cell.revenue > 0}
																		<p class="text-gray-300">{fmt(cell.revenue)}</p>
																	{/if}
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
									class="mt-3 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[10px] text-muted-foreground"
								>
									<span class="mr-1">Orders per hour:</span>
									<div class="flex items-center gap-1">
										<div class="h-3 w-4 rounded-sm bg-muted/30" aria-hidden="true"></div>
										<span>0</span>
									</div>
									{#each legendBuckets as bucket (bucket.label)}
										<div class="flex items-center gap-1">
											<div
												class="h-3 w-4 rounded-sm"
												style="background-color: oklch(0.612 0.17 152.75 / {bucket.opacity});"
												aria-hidden="true"
											></div>
											<span>{bucket.label}</span>
										</div>
									{/each}
								</div>
							</div>
						</div>
					{/if}
				</CardContent>
			</Card>

			<!-- Customer retention + Revenue by category -->
			<div class="mb-6 grid gap-6 lg:grid-cols-3">
				<!-- Customer retention -->
				<Card class="shadow-sm">
					<CardContent>
						<div class="mb-4">
							<h2 class="text-sm font-semibold text-gray-900">Customer retention</h2>
							<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
						</div>
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
					<CardContent>
						<div class="mb-4">
							<h2 class="text-sm font-semibold text-gray-900">Revenue by category</h2>
							<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
						</div>
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

			<!-- Operational metrics: 3 small cards -->
			<div class="grid gap-6 sm:grid-cols-3">
				<!-- Busiest pickup window -->
				<Card class="shadow-sm">
					<CardContent>
						<div class="mb-4">
							<h2 class="text-sm font-semibold text-gray-900">Busiest pickup window</h2>
							<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
						</div>
						{#if !busiestWindow}
							<p class="text-sm text-muted-foreground">No pickup-window orders this period.</p>
						{:else}
							<div class="space-y-1">
								<p
									class="truncate text-lg font-semibold text-foreground"
									title={busiestWindow.name}
								>
									{busiestWindow.name}
								</p>
								<p class="text-xs text-muted-foreground">
									{busiestWindow.orderCount}
									{busiestWindow.orderCount === 1 ? 'order' : 'orders'} · {fmt(
										busiestWindow.totalRevenue
									)}
								</p>
							</div>
						{/if}
					</CardContent>
				</Card>

				<!-- Average lead time -->
				<Card class="shadow-sm">
					<CardContent>
						<div class="mb-4">
							<h2 class="text-sm font-semibold text-gray-900">Avg scheduled lead time</h2>
							<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
						</div>
						{#if !leadTime || leadTime.sampleSize === 0}
							<p class="text-sm text-muted-foreground">Not enough data yet.</p>
						{:else}
							<p class="text-2xl font-bold text-foreground">
								{formatLeadTime(leadTime.avgLeadSeconds)}
							</p>
							<p class="mt-1 text-xs text-muted-foreground">
								Across {leadTime.sampleSize}
								{leadTime.sampleSize === 1 ? 'order' : 'orders'} with a scheduled pickup
							</p>
						{/if}
					</CardContent>
				</Card>

				<!-- Cancellation trend -->
				<Card class="shadow-sm">
					<CardContent>
						<div class="mb-4">
							<h2 class="text-sm font-semibold text-gray-900">Cancellations</h2>
							<p class="mt-0.5 text-xs text-gray-400">{rangeLabel(data)}</p>
						</div>
						{#if !cancellationTrend}
							<p class="text-sm text-muted-foreground">No data yet.</p>
						{:else}
							{@const trend = cancellationTrend}
							<p class="text-2xl font-bold text-foreground">{trend.current}</p>
							<p class="mt-1 text-xs">
								{#if trend.prior === 0 && trend.current > 0}
									<span class="text-amber-600">{trend.current} this period</span>
									<span class="text-muted-foreground"> (none prior)</span>
								{:else if trend.prior === 0 && trend.current === 0}
									<span class="text-muted-foreground">No cancellations this period</span>
								{:else}
									{@const delta = trend.current - trend.prior}
									{@const pct = Math.round((delta / trend.prior) * 100)}
									<span
										class={delta > 0
											? 'text-red-600'
											: delta < 0
												? 'text-emerald-600'
												: 'text-muted-foreground'}
									>
										{delta > 0 ? '+' : ''}{pct}% vs prev
									</span>
									<span class="text-muted-foreground"> ({trend.prior} prior)</span>
								{/if}
							</p>
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
							{#each [{ icon: 'mdi:clock-outline', label: 'Peak hours heatmap — find your busiest day/time combinations' }, { icon: 'mdi:account-group-outline', label: 'Customer retention — new vs. returning, return rate over time' }, { icon: 'mdi:trophy-outline', label: 'Top items by revenue vs. volume — they rank differently' }, { icon: 'mdi:calendar-star', label: 'Busiest pickup window — see which window drives the most orders' }, { icon: 'mdi:timer-sand', label: 'Average lead time — how far ahead customers are planning' }, { icon: 'mdi:close-octagon-outline', label: 'Cancellation trend — are losses growing or shrinking?' }, { icon: 'mdi:chart-donut', label: 'Revenue by category — see which categories drive the most revenue' }, { icon: 'mdi:download-outline', label: 'CSV export — download orders and items for accounting or BI' }] as feat (feat.label)}
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
