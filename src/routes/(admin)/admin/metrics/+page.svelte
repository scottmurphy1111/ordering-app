<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();

	const maxDaily = $derived(Math.max(1, ...data.dailySignups.map((d) => d.count)));

	function fmtMonthDay(yyyymmdd: string): string {
		const [, mm, dd] = yyyymmdd.split('-');
		return `${parseInt(mm)}/${parseInt(dd)}`;
	}
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Metrics</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Vendor counts, billing state, and growth over time.
		</p>
	</div>

	<!-- Tier breakdown -->
	<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">Vendors by tier</h2>
	<div class="mb-6 grid gap-4 sm:grid-cols-3">
		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
						<Icon icon="mdi:store-outline" class="h-5 w-5 text-muted-foreground" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Starter</p>
						<p class="text-2xl font-bold text-foreground">{data.tierCounts.starter}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:storefront-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Market</p>
						<p class="text-2xl font-bold text-foreground">{data.tierCounts.market}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:crown-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pro</p>
						<p class="text-2xl font-bold text-foreground">{data.tierCounts.pro}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- State breakdown -->
	<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">
		Paid subscriptions by state
	</h2>
	<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Active</p>
				<p class="mt-1 text-2xl font-bold text-foreground">{data.stateCounts.paidActive}</p>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Paused</p>
				<p class="mt-1 text-2xl font-bold text-foreground">{data.stateCounts.paused}</p>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
					Cancel scheduled
				</p>
				<p class="mt-1 text-2xl font-bold text-foreground">{data.stateCounts.cancelScheduled}</p>
			</CardContent>
		</Card>
		<Card class="shadow-sm">
			<CardContent>
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">Past due</p>
				<p
					class="mt-1 text-2xl font-bold {data.stateCounts.pastDue > 0
						? 'text-red-700'
						: 'text-foreground'}"
				>
					{data.stateCounts.pastDue}
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- MRR estimate -->
	<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">MRR estimate</h2>
	<Card class="mb-6 shadow-sm">
		<CardContent>
			<div class="flex items-baseline gap-3">
				<p class="text-3xl font-bold text-foreground">${data.mrrEstimate}</p>
				<p class="text-sm text-muted-foreground">per month</p>
			</div>
			<p class="mt-2 text-xs text-muted-foreground">
				Sum of plan prices for plain-active paid vendors. Excludes paused, cancel-scheduled,
				past-due, and add-on revenue. Annual subs counted at monthly rate.
			</p>
		</CardContent>
	</Card>

	<!-- Daily signups chart -->
	<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">
		Signups · last 30 days
	</h2>
	<Card class="shadow-sm">
		<CardContent>
			<div class="mb-4 flex items-center justify-between">
				<div>
					<p class="text-sm font-semibold text-foreground">Daily new vendors</p>
					<p class="mt-0.5 text-xs text-muted-foreground">UTC days</p>
				</div>
				<div class="text-right">
					<p class="text-lg font-semibold text-foreground">{data.totalSignupsLast30}</p>
					<p class="text-xs text-muted-foreground">total this period</p>
				</div>
			</div>

			<!-- Hand-rolled bar chart matching /dashboard/analytics pattern.
			     Tracked for refactor in roadmap entry "Shared data display primitives". -->
			<div class="flex h-36 items-end gap-px">
				{#each data.dailySignups as day (day.date)}
					{@const height =
						day.count === 0 ? 2 : Math.max(4, Math.round((day.count / maxDaily) * 144))}
					<div class="group relative flex flex-1 flex-col items-center justify-end">
						{#if day.count > 0}
							<!-- Always-visible mobile label; hidden on desktop where the hover tooltip works. -->
							<span
								class="absolute -top-3.5 text-[9px] leading-none font-medium text-muted-foreground md:hidden"
							>
								{day.count}
							</span>
						{/if}
						<div
							class="w-full rounded-sm bg-primary transition-colors group-hover:bg-primary/80"
							style="height: {height}px;"
						></div>
						{#if day.count > 0}
							<div
								class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 flex-col items-center group-hover:flex"
							>
								<div
									class="rounded-md bg-gray-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
								>
									<p>{day.count} signup{day.count === 1 ? '' : 's'}</p>
									<p class="text-muted-foreground">{day.date}</p>
								</div>
								<div class="-mt-1 h-1.5 w-1.5 rotate-45 bg-gray-900"></div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
			<div class="mt-1.5 flex justify-between text-xs text-muted-foreground">
				<span>{fmtMonthDay(data.dailySignups[0]?.date ?? '')}</span>
				<span>
					{fmtMonthDay(data.dailySignups[Math.floor(data.dailySignups.length / 2)]?.date ?? '')}
				</span>
				<span>{fmtMonthDay(data.dailySignups[data.dailySignups.length - 1]?.date ?? '')}</span>
			</div>
			{#if data.totalSignupsLast30 === 0}
				<p class="mt-2 text-center text-xs text-muted-foreground">
					No signups in the last 30 days yet.
				</p>
			{/if}
		</CardContent>
	</Card>
</div>
