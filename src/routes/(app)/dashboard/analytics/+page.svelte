<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	const { kpis, dailyData, topItems, statusBreakdown, typeBreakdown } = $derived(data);

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
		ready: 'bg-green-400',
		fulfilled: 'bg-gray-300',
		cancelled: 'bg-red-300'
	};

	const statusBadge: Record<string, string> = {
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-green-700',
		fulfilled: 'bg-gray-100 text-gray-600',
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
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
		<p class="mt-0.5 text-sm text-gray-500">Last 30 days vs previous 30 days.</p>
	</div>

	<!-- ── KPI cards ────────────────────────────────────────────── -->
	<div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
		<!-- Revenue 30d -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Revenue (30d)</p>
			<p class="mt-1.5 text-3xl font-bold text-gray-900">{fmt(kpis.revenue30)}</p>
			{#if kpis.revenueChange !== null}
				<p class="mt-1 text-xs {kpis.revenueChange >= 0 ? 'text-green-600' : 'text-red-500'}">
					{fmtPct(kpis.revenueChange)} vs prev 30d
				</p>
			{:else}
				<p class="mt-1 text-xs text-gray-400">No prior data</p>
			{/if}
		</div>

		<!-- Orders 30d -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Orders (30d)</p>
			<p class="mt-1.5 text-3xl font-bold text-gray-900">{kpis.orders30}</p>
			{#if kpis.ordersChange !== null}
				<p class="mt-1 text-xs {kpis.ordersChange >= 0 ? 'text-green-600' : 'text-red-500'}">
					{fmtPct(kpis.ordersChange)} vs prev 30d
				</p>
			{:else}
				<p class="mt-1 text-xs text-gray-400">No prior data</p>
			{/if}
		</div>

		<!-- Avg order value -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Avg Order</p>
			<p class="mt-1.5 text-3xl font-bold text-gray-900">{fmt(kpis.avgOrderValue)}</p>
			{#if kpis.avgChange !== null}
				<p class="mt-1 text-xs {kpis.avgChange >= 0 ? 'text-green-600' : 'text-red-500'}">
					{fmtPct(kpis.avgChange)} vs prev 30d
				</p>
			{:else}
				<p class="mt-1 text-xs text-gray-400">No prior data</p>
			{/if}
		</div>

		<!-- Revenue last 7d -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Revenue (7d)</p>
			<p class="mt-1.5 text-3xl font-bold text-gray-900">{fmt(kpis.revenue7)}</p>
			<p class="mt-1 text-xs text-gray-400">Last 7 days</p>
		</div>
	</div>

	<!-- ── Daily revenue chart ──────────────────────────────────── -->
	<div class="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
		<h2 class="mb-4 text-sm font-semibold text-gray-800">Daily revenue — last 30 days</h2>
		<div class="flex h-36 items-end gap-px">
			{#each dailyData as day (day.date)}
				{@const height =
					day.revenue === 0 ? 2 : Math.max(4, Math.round((day.revenue / maxDailyRevenue) * 144))}
				<div class="group relative flex flex-1 flex-col items-center justify-end">
					<div
						class="w-full rounded-sm bg-gray-800 transition-colors group-hover:bg-gray-600"
						style="height: {height}px;"
					></div>
					<!-- Tooltip -->
					{#if day.revenue > 0}
						<div
							class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
						>
							<div
								class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
							>
								<p>{fmt(day.revenue)}</p>
								<p class="text-gray-400">{day.count} {day.count === 1 ? 'order' : 'orders'}</p>
							</div>
							<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
		<!-- X-axis labels: just first, middle, last -->
		<div class="mt-1.5 flex justify-between text-xs text-gray-400">
			<span>{dailyData[0]?.date.slice(5)}</span>
			<span>{dailyData[14]?.date.slice(5)}</span>
			<span>{dailyData[29]?.date.slice(5)}</span>
		</div>
	</div>

	<!-- ── Bottom grid ───────────────────────────────────────────── -->
	<div class="grid gap-6 lg:grid-cols-3">
		<!-- Top items -->
		<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
			<h2 class="mb-4 text-sm font-semibold text-gray-800">Top items</h2>
			{#if topItems.length === 0}
				<p class="text-sm text-gray-400">No order data yet.</p>
			{:else}
				<div class="space-y-3">
					{#each topItems as item, i (item.name)}
						<div>
							<div class="mb-1 flex items-center justify-between gap-2">
								<div class="flex min-w-0 items-center gap-2">
									<span class="w-4 shrink-0 text-xs font-bold text-gray-400">#{i + 1}</span>
									<span class="truncate text-sm font-medium text-gray-800">{item.name}</span>
								</div>
								<div class="flex shrink-0 items-center gap-3 text-xs text-gray-500">
									<span>{item.totalQty} sold</span>
									<span class="font-medium text-gray-700">{fmt(item.totalRevenue)}</span>
								</div>
							</div>
							<div class="h-1.5 w-full rounded-full bg-gray-100">
								<div
									class="h-1.5 rounded-full bg-gray-800 transition-all"
									style="width: {Math.round((item.totalQty / maxItemQty) * 100)}%"
								></div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Right column -->
		<div class="space-y-6">
			<!-- Order types -->
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="mb-3 text-sm font-semibold text-gray-800">Order types</h2>
				{#if typeBreakdown.length === 0}
					<p class="text-sm text-gray-400">No data yet.</p>
				{:else}
					<div class="space-y-2.5">
						{#each typeBreakdown as row (row.type)}
							<div>
								<div class="mb-1 flex items-center justify-between text-xs">
									<span class="inline-flex items-center gap-1 text-gray-600">
										<Icon icon={typeIcons[row.type] ?? 'mdi:food'} class="h-3.5 w-3.5" />
										{typeLabels[row.type] ?? row.type}
									</span>
									<span class="font-medium text-gray-700">{fmt(row.revenue ?? 0)}</span>
								</div>
								<div class="h-1.5 w-full rounded-full bg-gray-100">
									<div
										class="h-1.5 rounded-full bg-gray-700"
										style="width: {Math.round(((row.revenue ?? 0) / totalTypeRevenue) * 100)}%"
									></div>
								</div>
								<p class="mt-0.5 text-right text-xs text-gray-400">{row.count} orders</p>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Status breakdown -->
			<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
				<h2 class="mb-3 text-sm font-semibold text-gray-800">By status (30d)</h2>
				{#if statusBreakdown.length === 0}
					<p class="text-sm text-gray-400">No data yet.</p>
				{:else}
					<!-- Stacked bar -->
					<div class="mb-3 flex h-3 w-full overflow-hidden rounded-full">
						{#each statusBreakdown as row (row.status)}
							<div
								class="{statusColors[row.status] ?? 'bg-gray-200'} transition-all"
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
											'bg-gray-100 text-gray-600'} capitalize"
									>
										{row.status}
									</span>
								</span>
								<span class="font-medium text-gray-700">{row.count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
